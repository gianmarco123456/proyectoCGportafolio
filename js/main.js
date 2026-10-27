import { Vector3 } from './math/Vector3.js';
import { Object3D } from './core/Object3D.js';
import { Scene } from './core/Scene.js';
import { Renderer } from './core/Renderer.js';
import { BoxGeometry } from './geometries/BoxGeometry.js';
import { PlaneGeometry } from './geometries/PlaneGeometry.js';
import { CylinderGeometry } from './geometries/CylinderGeometry.js';
import { BasicMaterial } from './materials/BasicMaterial.js';
import { Mesh } from './objects/Mesh.js';
import { PerspectiveCamera } from './cameras/PerspectiveCamera.js';
import { CarController } from './controls/CarController.js';
import { ThirdPersonCamera } from './controls/ThirdPersonCamera.js';
import { TextureLoader } from './utils/TextureLoader.js';

/**
 * main.js
 * Punto de entrada del Portafolio Interactivo 3D estilo Juego de Carrito.
 * Ensambla la escena WebGL2, el vehículo jerárquico, las estaciones de redes/proyectos,
 * el detector de proximidad en el plano XZ, la interfaz overlay y el minimapa 2D.
 */
class PortfolioGame {
    constructor() {
        this.canvas = document.getElementById('webgl-canvas');
        this.minimapCanvas = document.getElementById('minimap-canvas');
        this.minimapCtx = this.minimapCanvas ? this.minimapCanvas.getContext('2d') : null;

        // 1. Inicializar Motor WebGL 2.0
        this.renderer = new Renderer(this.canvas);
        this.gl = this.renderer.gl;
        this.scene = new Scene();
        this.textureLoader = new TextureLoader(this.gl);

        // 2. Inicializar Cámara de Perspectiva
        this.camera = new PerspectiveCamera(60, this.renderer.getAspect(), 0.1, 220);
        window.addEventListener('resize', () => {
            this.camera.aspect = this.renderer.getAspect();
            this.camera.updateProjectionMatrix();
        });

        // Colecciones de elementos interactivos y colisionadores AABB
        this.colliders = [];
        this.stations = [];
        this.activeStation = null;

        // 3. Construir el Mundo 3D, el Carrito y las Cajas Interactivas
        this.buildWorld();
        this.buildCar();
        this.buildPortfolioStations();
        this.buildEnvironmentDecorations();

        // 4. Inicializar Controles del Vehículo y Cámara en 3ra Persona
        this.carController = new CarController(this.carNode, this.wheelRefs);
        this.thirdPersonCamera = new ThirdPersonCamera(this.camera, this.carNode, {
            distance: 9.8,
            height: 4.5,
            lookAhead: 3.0,
            smoothFactor: 7.0
        });

        // 5. Inicializar referencias DOM de la Interfaz Overlay
        this.initOverlayDOM();

        // 6. Iniciar bucle de animación
        this.lastTime = performance.now();
        this.elapsedTime = 0;
        requestAnimationFrame((t) => this.animate(t));
    }

    /**
     * Construye el terreno base con rejilla synthwave y pistas principales.
     */
    buildWorld() {
        // Suelo principal con grilla procedural activada en el Fragment Shader
        const groundGeo = new PlaneGeometry(160, 160, 1, 1);
        const groundMat = new BasicMaterial({
            color: [0.06, 0.07, 0.14],
            specularStrength: 0.15,
            shininess: 16.0,
            isGroundGrid: true
        });
        const groundMesh = new Mesh(groundGeo, groundMat, 'GroundTerrain');
        this.scene.add(groundMesh);

        // Pista central de asfalto (cruz vial que conecta las estaciones)
        const roadMat = new BasicMaterial({
            color: [0.11, 0.12, 0.18],
            specularStrength: 0.25,
            shininess: 24.0
        });

        const mainRoadZ = new Mesh(new PlaneGeometry(7.5, 130), roadMat, 'MainRoadZ');
        mainRoadZ.position.set(0, 0.02, 0);
        this.scene.add(mainRoadZ);

        const mainRoadX = new Mesh(new PlaneGeometry(130, 7.5), roadMat, 'MainRoadX');
        mainRoadX.position.set(0, 0.025, 0);
        this.scene.add(mainRoadX);

        // Líneas de neón cian a los lados de las avenidas
        const neonLineMat = new BasicMaterial({
            color: [0.0, 0.9, 1.0],
            emissive: [0.0, 0.65, 0.85],
            unlit: true
        });

        const stripGeoZ = new PlaneGeometry(0.18, 130);
        const leftStripZ = new Mesh(stripGeoZ, neonLineMat);
        leftStripZ.position.set(-3.75, 0.035, 0);
        const rightStripZ = new Mesh(stripGeoZ, neonLineMat);
        rightStripZ.position.set(3.75, 0.035, 0);
        this.scene.add(leftStripZ);
        this.scene.add(rightStripZ);

        // Plaza central de inicio (Spawn Pad)
        const padMat = new BasicMaterial({
            color: [0.16, 0.18, 0.28],
            emissive: [0.04, 0.08, 0.16]
        });
        const centerPad = new Mesh(new BoxGeometry(9, 0.08, 9), padMat, 'SpawnPad');
        centerPad.position.set(0, 0.04, 0);
        this.scene.add(centerPad);
    }

    /**
     * Construye el Carrito Conducible como un Object3D jerárquico compuesto:
     * - CarNode (Raíz)
     *   ├── ChassisGroup (Cuerpo inferior, cabina, alerón, faros delanteros y traseros)
     *   ├── Pivote Delantero Izquierdo -> Rueda Delantera Izquierda (CylinderGeometry)
     *   ├── Pivote Delantero Derecho   -> Rueda Delantera Derecha (CylinderGeometry)
     *   ├── Rueda Trasera Izquierda    (CylinderGeometry)
     *   └── Rueda Trasera Derecha      (CylinderGeometry)
     */
    buildCar() {
        this.carNode = new Object3D('PlayerCar');
        this.carNode.position.set(0, 0, 0);
        this.scene.add(this.carNode);

        // Nodo hijo para el chasis (permite inclinar la suspensión sin inclinar las ruedas)
        const chassisGroup = new Object3D('ChassisGroup');
        this.carNode.add(chassisGroup);
        this.carNode.chassisMesh = chassisGroup;

        // 1. Chasis Principal (BoxGeometry)
        const bodyGeo = new BoxGeometry(1.75, 0.52, 3.4);
        const bodyMat = new BasicMaterial({
            color: [0.95, 0.16, 0.38],
            emissive: [0.12, 0.02, 0.05],
            specularStrength: 0.85,
            shininess: 64.0
        });
        const bodyMesh = new Mesh(bodyGeo, bodyMat, 'CarBody');
        bodyMesh.position.set(0, 0.62, 0);
        chassisGroup.add(bodyMesh);

        // 2. Cabina / Techo (BoxGeometry más pequeña)
        const cabinGeo = new BoxGeometry(1.42, 0.46, 1.65);
        const cabinMat = new BasicMaterial({
            color: [0.10, 0.14, 0.24],
            emissive: [0.02, 0.06, 0.12],
            specularStrength: 0.95,
            shininess: 96.0
        });
        const cabinMesh = new Mesh(cabinGeo, cabinMat, 'CarCabin');
        cabinMesh.position.set(0, 1.08, -0.18);
        chassisGroup.add(cabinMesh);

        // 3. Alerón deportivo trasero (Spoiler)
        const spoilerWing = new Mesh(
            new BoxGeometry(1.65, 0.08, 0.36),
            bodyMat,
            'SpoilerWing'
        );
        spoilerWing.position.set(0, 1.06, -1.52);
        chassisGroup.add(spoilerWing);

        // 4. Faros delanteros emisivos (+Z es el frente del vehículo)
        const headlightGeo = new BoxGeometry(0.34, 0.16, 0.1);
        const headlightMat = new BasicMaterial({
            color: [0.85, 0.98, 1.0],
            emissive: [0.6, 0.95, 1.0],
            unlit: true
        });
        const leftLight = new Mesh(headlightGeo, headlightMat, 'HeadlightL');
        leftLight.position.set(-0.56, 0.65, 1.71);
        const rightLight = new Mesh(headlightGeo, headlightMat, 'HeadlightR');
        rightLight.position.set(0.56, 0.65, 1.71);
        chassisGroup.add(leftLight);
        chassisGroup.add(rightLight);

        // 5. Luces de freno traseras (-Z)
        const tailLightMat = new BasicMaterial({
            color: [1.0, 0.1, 0.2],
            emissive: [0.9, 0.05, 0.15],
            unlit: true
        });
        const tailLight = new Mesh(new BoxGeometry(1.45, 0.14, 0.08), tailLightMat, 'TailLight');
        tailLight.position.set(0, 0.68, -1.71);
        chassisGroup.add(tailLight);

        // 6. Las 4 Ruedas usando CylinderGeometry alineado en el eje X
        const wheelGeo = new CylinderGeometry(0.42, 0.42, 0.34, 20, true);
        const wheelMat = new BasicMaterial({
            color: [0.16, 0.18, 0.22],
            specularStrength: 0.3,
            shininess: 16.0
        });

        // Tapacubos / Rines luminosos para apreciar claramente el giro de las ruedas
        const rimGeo = new BoxGeometry(0.38, 0.52, 0.14);
        const rimMat = new BasicMaterial({
            color: [0.0, 0.92, 1.0],
            emissive: [0.0, 0.45, 0.6]
        });

        this.wheelRefs = {
            frontPivots: [],
            wheels: []
        };

        const wheelConfigs = [
            { name: 'WheelFL', x:  0.92, y: 0.42, z:  1.08, isFront: true },
            { name: 'WheelFR', x: -0.92, y: 0.42, z:  1.08, isFront: true },
            { name: 'WheelRL', x:  0.92, y: 0.42, z: -1.08, isFront: false },
            { name: 'WheelRR', x: -0.92, y: 0.42, z: -1.08, isFront: false }
        ];

        wheelConfigs.forEach((cfg) => {
            const wheelMesh = new Mesh(wheelGeo, wheelMat, cfg.name);
            const rimBar = new Mesh(rimGeo, rimMat, cfg.name + '_Rim');
            wheelMesh.add(rimBar);

            if (cfg.isFront) {
                // Crear pivote de dirección para que gire en Y (izquierda/derecha) mientras la rueda gira en X
                const steerPivot = new Object3D(cfg.name + '_Pivot');
                steerPivot.position.set(cfg.x, cfg.y, cfg.z);
                steerPivot.add(wheelMesh);
                this.carNode.add(steerPivot);
                this.wheelRefs.frontPivots.push(steerPivot);
            } else {
                wheelMesh.position.set(cfg.x, cfg.y, cfg.z);
                this.carNode.add(wheelMesh);
            }

            this.wheelRefs.wheels.push(wheelMesh);
        });
    }

    /**
     * Crea las 5 estaciones interactivas del portafolio (GitHub, LinkedIn, Twitter, Email, Project 1)
     * con sus texturas 2D, pedestales luminosos, colisionadores AABB y zonas de detección.
     */
    buildPortfolioStations() {
        const stationConfigs = [
            {
                id: 'github',
                title: 'GitHub — Repositorios & Motor WebGL2',
                category: 'CÓDIGO ABIERTO',
                description: 'Explora mis proyectos de Computación Gráfica 3D, shaders GLSL ES 3.00, algoritmos de física y arquitecturas modulares en JavaScript puro.',
                url: 'https://github.com/',
                buttonText: 'Abrir GitHub',
                texturePath: 'texturas/github.png',
                position: new Vector3(-18, 2.2, 22),
                accentColor: [0.0, 0.94, 1.0],
                hexColor: '#00f0ff'
            },
            {
                id: 'linkedin',
                title: 'LinkedIn — Perfil Profesional & CV',
                category: 'RED PROFESIONAL',
                description: 'Conecta conmigo para oportunidades en Ingeniería de Software, Desarrollo Frontend Avanzado, Motores Gráficos y Visualización Interactiva.',
                url: 'https://www.linkedin.com/',
                buttonText: 'Ver Perfil en LinkedIn',
                texturePath: 'texturas/linkedin.png',
                position: new Vector3(18, 2.2, 22),
                accentColor: [0.22, 0.71, 1.0],
                hexColor: '#38b6ff'
            },
            {
                id: 'project1',
                title: 'Proyecto Destacado — Motor Gráfico WebGL2',
                category: 'PROYECTO ESTRELLA',
                description: 'Motor 3D propietario sin dependencias externas: Grafo de Escena jerárquico, matrices homogéneas 4x4, iluminación Blinn-Phong y físicas de vehículo.',
                url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGL2RenderingContext',
                buttonText: 'Ver Demo / Documentación',
                texturePath: 'texturas/project1.png',
                position: new Vector3(0, 2.4, 36),
                accentColor: [0.0, 1.0, 0.62],
                hexColor: '#00ff9d'
            },
            {
                id: 'twitter',
                title: 'Twitter / X — DevLogs & Shaders',
                category: 'COMUNIDAD & DEVLOGS',
                description: 'Hilos técnicos sobre matemáticas 3D, experimentos con WebGL2, optimización de pipelines gráficos y avances de proyectos interactivos.',
                url: 'https://x.com/',
                buttonText: 'Seguir en X / Twitter',
                texturePath: 'texturas/twitter.png',
                position: new Vector3(-24, 2.2, -16),
                accentColor: [0.72, 0.40, 1.0],
                hexColor: '#b967ff'
            },
            {
                id: 'email',
                title: 'Contacto Directo — Hablemos',
                category: 'CONTACTO',
                description: '¿Tienes un proyecto desafiante o buscas un Ingeniero en Computación Gráfica y WebGL? Envíame un correo directo para conversar.',
                url: 'mailto:contacto@portafolio3d.dev?subject=Contacto%20desde%20Portafolio%203D%20WebGL2',
                buttonText: 'Enviar Correo Electrónico',
                texturePath: 'texturas/email.png',
                position: new Vector3(24, 2.2, -16),
                accentColor: [1.0, 0.25, 0.61],
                hexColor: '#ff409c'
            }
        ];

        const boxGeo = new BoxGeometry(3.2, 3.2, 3.2);
        const pedestalGeo = new BoxGeometry(4.4, 0.45, 4.4);
        const auraGeo = new PlaneGeometry(9.0, 9.0);

        stationConfigs.forEach((cfg) => {
            // 1. Cargar textura PNG correspondiente
            const texture = this.textureLoader.load(cfg.texturePath);

            // 2. Malla del cubo interactivo con la textura del logo
            const boxMat = new BasicMaterial({
                color: [1.0, 1.0, 1.0],
                texture: texture,
                emissive: [cfg.accentColor[0] * 0.12, cfg.accentColor[1] * 0.12, cfg.accentColor[2] * 0.12],
                specularStrength: 0.6,
                shininess: 48.0
            });
            const boxMesh = new Mesh(boxGeo, boxMat, `Box_${cfg.id}`);
            boxMesh.position.copy(cfg.position);
            this.scene.add(boxMesh);

            // 3. Pedestal sólido bajo el cubo
            const pedestalMat = new BasicMaterial({
                color: [0.12, 0.14, 0.22],
                emissive: [cfg.accentColor[0] * 0.08, cfg.accentColor[1] * 0.08, cfg.accentColor[2] * 0.08]
            });
            const pedestalMesh = new Mesh(pedestalGeo, pedestalMat, `Pedestal_${cfg.id}`);
            pedestalMesh.position.set(cfg.position.x, 0.225, cfg.position.z);
            this.scene.add(pedestalMesh);

            // 4. Aura luminosa en el suelo para indicar la zona de activación (Trigger Zone)
            const auraMat = new BasicMaterial({
                color: cfg.accentColor,
                emissive: [cfg.accentColor[0] * 0.4, cfg.accentColor[1] * 0.4, cfg.accentColor[2] * 0.4],
                opacity: 0.28,
                unlit: true
            });
            const auraMesh = new Mesh(auraGeo, auraMat, `Aura_${cfg.id}`);
            auraMesh.position.set(cfg.position.x, 0.03, cfg.position.z);
            this.scene.add(auraMesh);

            // 5. Registrar colisionador AABB para que el carrito no atraviese el pedestal
            this.colliders.push({
                x: cfg.position.x,
                z: cfg.position.z,
                halfW: 2.2,
                halfD: 2.2
            });

            // 6. Registrar estación para detección de proximidad euclidiana en XZ
            this.stations.push({
                ...cfg,
                mesh: boxMesh,
                auraMesh: auraMesh,
                baseY: cfg.position.y,
                triggerRadius: 7.5
            });
        });
    }

    /**
     * Añade pilares de iluminación synthwave y barreras perimetrales con colisión AABB.
     */
    buildEnvironmentDecorations() {
        const pillarGeo = new BoxGeometry(1.2, 6.5, 1.2);
        const capGeo = new BoxGeometry(1.5, 0.4, 1.5);

        const pillarPositions = [
            [-10, 10], [10, 10],
            [-10, -10], [10, -10],
            [-10, 28], [10, 28],
            [-32, 0], [32, 0]
        ];

        pillarPositions.forEach(([x, z], idx) => {
            const isCyan = idx % 2 === 0;
            const neonColor = isCyan ? [0.0, 0.88, 1.0] : [1.0, 0.2, 0.65];

            const pillarMat = new BasicMaterial({
                color: [0.10, 0.12, 0.20],
                specularStrength: 0.5,
                shininess: 32.0
            });
            const pillar = new Mesh(pillarGeo, pillarMat, `Pillar_${idx}`);
            pillar.position.set(x, 3.25, z);
            this.scene.add(pillar);

            const neonCapMat = new BasicMaterial({
                color: neonColor,
                emissive: neonColor,
                unlit: true
            });
            const cap = new Mesh(capGeo, neonCapMat, `PillarCap_${idx}`);
            cap.position.set(x, 6.6, z);
            this.scene.add(cap);

            this.colliders.push({
                x,
                z,
                halfW: 0.75,
                halfD: 0.75
            });
        });
    }

    /**
     * Enlaza los elementos HTML de la tarjeta emergente, velocímetro y botones de acceso rápido.
     */
    initOverlayDOM() {
        this.popupCard = document.getElementById('station-popup');
        this.popupCategory = document.getElementById('popup-category');
        this.popupTitle = document.getElementById('popup-title');
        this.popupDesc = document.getElementById('popup-desc');
        this.popupLink = document.getElementById('popup-link');
        this.popupDistance = document.getElementById('popup-distance');
        this.speedValueEl = document.getElementById('speed-value');
        this.coordsValueEl = document.getElementById('coords-value');

        // Atajo con tecla Enter o Espacio para abrir el enlace cuando una estación está activa
        window.addEventListener('keydown', (e) => {
            if ((e.code === 'Enter' || e.code === 'KeyE') && this.activeStation) {
                window.open(this.activeStation.url, '_blank', 'noopener,noreferrer');
            }
            // Tecla R para reiniciar posición del auto al centro de la pista
            if (e.code === 'KeyR') {
                this.carNode.position.set(0, 0, 0);
                this.carNode.rotation.set(0, 0, 0);
                this.carController.speed = 0;
            }
        });
    }

    /**
     * Evalúa la distancia euclidiana en el plano XZ entre el carrito y cada estación:
     * d_social = sqrt((x_car - x_box)^2 + (z_car - z_box)^2)
     * Si d_social < R_trigger, muestra el overlay HTML con el enlace correspondiente.
     */
    updateStationsAndProximity(dt) {
        let closestStation = null;
        let minDistance = Infinity;

        for (let i = 0; i < this.stations.length; i++) {
            const st = this.stations[i];

            // Animación continua de levitación y rotación suave del cubo
            st.mesh.rotation.y += 0.85 * dt;
            st.mesh.position.y = st.baseY + Math.sin(this.elapsedTime * 2.4 + i) * 0.25;

            // Cálculo de distancia en el plano XZ (fórmula del SKILL.md)
            const distXZ = this.carNode.position.distanceToXZ(st.position);

            if (distXZ < st.triggerRadius && distXZ < minDistance) {
                minDistance = distXZ;
                closestStation = st;
            }

            // Resaltar el brillo emisivo cuando el carrito está dentro del radio
            const isNear = distXZ < st.triggerRadius;
            const emissiveScale = isNear ? 0.48 : 0.12;
            st.mesh.material.emissive[0] = st.accentColor[0] * emissiveScale;
            st.mesh.material.emissive[1] = st.accentColor[1] * emissiveScale;
            st.mesh.material.emissive[2] = st.accentColor[2] * emissiveScale;
            st.auraMesh.material.opacity = isNear ? 0.55 : 0.25;
        }

        // Actualizar tarjeta emergente DOM
        if (closestStation !== this.activeStation) {
            this.activeStation = closestStation;
            if (closestStation) {
                this.popupCategory.textContent = closestStation.category;
                this.popupCategory.style.color = closestStation.hexColor;
                this.popupTitle.textContent = closestStation.title;
                this.popupDesc.textContent = closestStation.description;
                this.popupLink.href = closestStation.url;
                this.popupLink.textContent = closestStation.buttonText;
                this.popupCard.style.setProperty('--station-accent', closestStation.hexColor);
                this.popupCard.classList.remove('hidden');
            } else {
                this.popupCard.classList.add('hidden');
            }
        }

        if (this.activeStation && this.popupDistance) {
            this.popupDistance.textContent = `Distancia: ${minDistance.toFixed(1)}m`;
        }
    }

    /**
     * Actualiza el HUD de telemetría y dibuja el minimapa 2D en tiempo real.
     */
    updateHUD() {
        const kmh = Math.round(Math.abs(this.carController.speed) * 4.2);
        if (this.speedValueEl) {
            this.speedValueEl.textContent = kmh.toString().padStart(2, '0');
        }
        if (this.coordsValueEl) {
            const x = Math.round(this.carNode.position.x);
            const z = Math.round(this.carNode.position.z);
            this.coordsValueEl.textContent = `X: ${x} | Z: ${z}`;
        }

        if (!this.minimapCtx) return;
        const ctx = this.minimapCtx;
        const w = this.minimapCanvas.width;
        const h = this.minimapCanvas.height;
        const cx = w / 2;
        const cy = h / 2;
        const scale = 1.45; // Escala de unidades 3D a píxeles 2D

        ctx.clearRect(0, 0, w, h);

        // Fondo del radar
        ctx.fillStyle = 'rgba(10, 14, 28, 0.85)';
        ctx.fillRect(0, 0, w, h);

        // Cruz de ejes
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(cx, 0); ctx.lineTo(cx, h);
        ctx.moveTo(0, cy); ctx.lineTo(w, cy);
        ctx.stroke();

        // Dibujar estaciones en el minimapa (invertimos Z para que +Z esté arriba)
        for (let i = 0; i < this.stations.length; i++) {
            const st = this.stations[i];
            const sx = cx - st.position.x * scale;
            const sy = cy - st.position.z * scale;

            ctx.fillStyle = st.hexColor;
            ctx.beginPath();
            ctx.arc(sx, sy, 4.5, 0, Math.PI * 2);
            ctx.fill();
        }

        // Dibujar posición y orientación del carrito
        const carX = cx - this.carNode.position.x * scale;
        const carY = cy - this.carNode.position.z * scale;

        ctx.save();
        ctx.translate(carX, carY);
        ctx.rotate(-this.carNode.rotation.y);
        ctx.fillStyle = '#ff2975';
        ctx.beginPath();
        ctx.moveTo(0, -6);
        ctx.lineTo(4.5, 5);
        ctx.lineTo(-4.5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    /**
     * Bucle principal de simulación y renderizado (Game Loop).
     */
    animate(now) {
        const dt = Math.min((now - this.lastTime) / 1000, 0.1);
        this.lastTime = now;
        this.elapsedTime += dt;

        // 1. Actualizar físicas del vehículo y colisiones AABB
        this.carController.update(dt, this.colliders);

        // 2. Actualizar cámara de persecución en 3ra persona
        this.thirdPersonCamera.update(dt);

        // 3. Evaluar proximidad a las estaciones de redes/proyectos
        this.updateStationsAndProximity(dt);

        // 4. Actualizar HUD y Minimapa
        this.updateHUD();

        // 5. Renderizar escena 3D en WebGL 2.0
        this.renderer.render(this.scene, this.camera);

        requestAnimationFrame((t) => this.animate(t));
    }
}

window.addEventListener('DOMContentLoaded', () => {
    new PortfolioGame();
});
