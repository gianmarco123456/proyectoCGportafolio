import { Vector3 } from '../math/Vector3.js';

/**
 * CarController.js
 * Controlador de físicas estilo Arcade para el vehículo conducible.
 * Gestiona entrada por teclado (WASD y Flechas), aceleración, reversa, fricción,
 * giro del vehículo sobre el eje Y, rotación de ruedas, y colisiones AABB con cajas/límites.
 */
export class CarController {
    /**
     * @param {Object3D} carNode Nodo raíz del carrito
     * @param {Object} wheelRefs Referencias a las ruedas para animación
     * @param {Array<Object3D>} wheelRefs.frontPivots Pivotes de dirección delanteros (giran en Y)
     * @param {Array<Object3D>} wheelRefs.wheels Mallas de las 4 ruedas (ruedan en X)
     */
    constructor(carNode, wheelRefs = { frontPivots: [], wheels: [] }) {
        this.car = carNode;
        this.frontPivots = wheelRefs.frontPivots || [];
        this.wheels = wheelRefs.wheels || [];

        // Parámetros físicos del vehículo
        this.speed = 0;
        this.maxSpeed = 24.0;
        this.maxReverseSpeed = -11.0;
        this.acceleration = 32.0;
        this.braking = 48.0;
        this.friction = 14.0;

        this.steeringAngle = 0;
        this.maxSteeringAngle = 0.55; // Radianes de giro visual de las ruedas delanteras
        this.steeringSpeed = 5.5;
        this.turnRate = 2.35;         // Velocidad angular del chasis

        this.wheelRadius = 0.42;
        this.carRadius = 1.45;        // Radio de colisión aproximado del vehículo en XZ
        this.worldLimit = 72.0;       // Límite de la pista

        // Estado de teclas
        this.keys = {
            forward: false,
            backward: false,
            left: false,
            right: false,
            boost: false
        };

        this.prevPosition = new Vector3();
        this.initInputListeners();
    }

    initInputListeners() {
        const handleKey = (e, isDown) => {
            const code = e.code;
            switch (code) {
                case 'KeyW':
                case 'ArrowUp':
                    this.keys.forward = isDown;
                    break;
                case 'KeyS':
                case 'ArrowDown':
                    this.keys.backward = isDown;
                    break;
                case 'KeyA':
                case 'ArrowLeft':
                    this.keys.left = isDown;
                    break;
                case 'KeyD':
                case 'ArrowRight':
                    this.keys.right = isDown;
                    break;
                case 'ShiftLeft':
                case 'ShiftRight':
                    this.keys.boost = isDown;
                    break;
            }
        };

        window.addEventListener('keydown', (e) => handleKey(e, true));
        window.addEventListener('keyup', (e) => handleKey(e, false));
        window.addEventListener('blur', () => {
            this.keys.forward = false;
            this.keys.backward = false;
            this.keys.left = false;
            this.keys.right = false;
            this.keys.boost = false;
        });
    }

    /**
     * Actualiza la física del vehículo en cada frame:
     * x_{t+1} = x_t + v * sin(theta_car) * dt
     * z_{t+1} = z_t + v * cos(theta_car) * dt
     * @param {number} dt Delta time en segundos
     * @param {Array<Object>} colliders Lista de obstáculos AABB { x, z, halfW, halfD }
     */
    update(dt, colliders = []) {
        const topSpeed = this.keys.boost ? this.maxSpeed * 1.35 : this.maxSpeed;
        const accel = this.keys.boost ? this.acceleration * 1.4 : this.acceleration;

        // 1. Aceleración / Freno / Reversa
        if (this.keys.forward) {
            if (this.speed < 0) {
                this.speed += this.braking * dt;
            } else {
                this.speed += accel * dt;
            }
        } else if (this.keys.backward) {
            if (this.speed > 0) {
                this.speed -= this.braking * dt;
            } else {
                this.speed -= (this.acceleration * 0.75) * dt;
            }
        } else {
            // Fricción / Inercia progresiva cuando no se presionan teclas
            if (Math.abs(this.speed) > 0.15) {
                this.speed -= Math.sign(this.speed) * this.friction * dt;
            } else {
                this.speed = 0;
            }
        }

        // Limitar velocidad escalar v
        this.speed = Math.max(this.maxReverseSpeed, Math.min(topSpeed, this.speed));

        // 2. Dirección (Steering) suave en las ruedas delanteras
        let targetSteer = 0;
        if (this.keys.left) targetSteer += this.maxSteeringAngle;
        if (this.keys.right) targetSteer -= this.maxSteeringAngle;

        this.steeringAngle += (targetSteer - this.steeringAngle) * Math.min(1, this.steeringSpeed * dt);

        // Rotar pivotes de ruedas delanteras en Y
        for (let i = 0; i < this.frontPivots.length; i++) {
            this.frontPivots[i].rotation.y = this.steeringAngle;
        }

        // 3. Rotación del chasis (theta_car) proporcional a la velocidad actual
        if (Math.abs(this.speed) > 0.1) {
            const speedFactor = Math.min(1.0, Math.abs(this.speed) / 6.0);
            const dirSign = Math.sign(this.speed);
            const angularVelocity = (this.steeringAngle / this.maxSteeringAngle) * this.turnRate * speedFactor * dirSign;
            this.car.rotation.y += angularVelocity * dt;
        }

        // Inclinación sutil del chasis (body roll / pitch) para sensación de suspensión viva
        if (this.car.chassisMesh) {
            const targetRoll = -this.steeringAngle * (this.speed / this.maxSpeed) * 0.12;
            this.car.chassisMesh.rotation.z += (targetRoll - this.car.chassisMesh.rotation.z) * 10 * dt;
        }

        // 4. Desplazamiento según la fórmula trigonométrica del SKILL.md
        this.prevPosition.copy(this.car.position);
        const theta = this.car.rotation.y;

        this.car.position.x += this.speed * Math.sin(theta) * dt;
        this.car.position.z += this.speed * Math.cos(theta) * dt;

        // 5. Rotación de las 4 ruedas sobre su eje X
        const wheelDeltaRot = (this.speed * dt) / this.wheelRadius;
        for (let i = 0; i < this.wheels.length; i++) {
            this.wheels[i].rotation.x += wheelDeltaRot;
        }

        // 6. Resolución de colisiones AABB y límites del mapa
        this.resolveCollisions(colliders);
    }

    /**
     * Resuelve colisiones AABB (Axis-Aligned Bounding Box) en el plano XZ.
     */
    resolveCollisions(colliders) {
        const pos = this.car.position;
        const r = this.carRadius;

        // Límites exteriores del mundo
        if (pos.x > this.worldLimit) { pos.x = this.worldLimit; this.speed *= 0.5; }
        if (pos.x < -this.worldLimit) { pos.x = -this.worldLimit; this.speed *= 0.5; }
        if (pos.z > this.worldLimit) { pos.z = this.worldLimit; this.speed *= 0.5; }
        if (pos.z < -this.worldLimit) { pos.z = -this.worldLimit; this.speed *= 0.5; }

        // Colisión contra cada obstáculo o caja AABB
        for (let i = 0; i < colliders.length; i++) {
            const box = colliders[i];
            const minX = box.x - box.halfW - r;
            const maxX = box.x + box.halfW + r;
            const minZ = box.z - box.halfD - r;
            const maxZ = box.z + box.halfD + r;

            if (pos.x > minX && pos.x < maxX && pos.z > minZ && pos.z < maxZ) {
                // Calcular penetración en cada borde para expulsar el auto suavemente
                const overlapLeft = pos.x - minX;
                const overlapRight = maxX - pos.x;
                const overlapTop = pos.z - minZ;
                const overlapBottom = maxZ - pos.z;

                const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

                if (minOverlap === overlapLeft) {
                    pos.x = minX;
                } else if (minOverlap === overlapRight) {
                    pos.x = maxX;
                } else if (minOverlap === overlapTop) {
                    pos.z = minZ;
                } else {
                    pos.z = maxZ;
                }

                // Reducir velocidad por impacto
                this.speed *= -0.25;
            }
        }
    }
}
