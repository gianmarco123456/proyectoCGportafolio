/**
 * Renderer.js
 * Motor de renderizado nativo en WebGL 2.0 (GLSL ES 3.00).
 * Compila el pipeline de shaders con iluminación Phong/Blinn-Phong, texturas 2D,
 * grilla procedural para el suelo, emisividad y niebla atmosférica.
 */
export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        const gl = canvas.getContext('webgl2', { antialias: true, alpha: false });
        if (!gl) {
            throw new Error('WebGL 2.0 no está soportado en este navegador.');
        }
        this.gl = gl;

        this.initGL();
        this.program = this.createShaderProgram();
        this.uniformLocations = this.getUniformLocations();
        this.defaultWhiteTexture = this.createDefaultTexture();

        this.resize();
        window.addEventListener('resize', () => this.resize());
    }

    initGL() {
        const gl = this.gl;
        gl.enable(gl.DEPTH_TEST);
        gl.depthFunc(gl.LEQUAL);
        gl.enable(gl.CULL_FACE);
        gl.cullFace(gl.BACK);
        gl.enable(gl.BLEND);
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
    }

    resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const width = Math.floor(window.innerWidth * dpr);
        const height = Math.floor(window.innerHeight * dpr);

        if (this.canvas.width !== width || this.canvas.height !== height) {
            this.canvas.width = width;
            this.canvas.height = height;
            this.gl.viewport(0, 0, width, height);
        }
    }

    getAspect() {
        return this.canvas.width / this.canvas.height;
    }

    createDefaultTexture() {
        const gl = this.gl;
        const tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([255, 255, 255, 255])
        );
        return tex;
    }

    createShaderProgram() {
        const gl = this.gl;

        const vsSource = `#version 300 es
        precision highp float;

        layout(location = 0) in vec3 a_position;
        layout(location = 1) in vec3 a_normal;
        layout(location = 2) in vec2 a_uv;

        uniform mat4 u_model;
        uniform mat4 u_view;
        uniform mat4 u_projection;

        out vec2 v_uv;
        out vec3 v_normal;
        out vec3 v_worldPos;

        void main() {
            vec4 worldPosition = u_model * vec4(a_position, 1.0);
            v_worldPos = worldPosition.xyz;
            // Transformación de normales usando la submatriz 3x3 del modelo
            v_normal = mat3(transpose(inverse(u_model))) * a_normal;
            v_uv = a_uv;
            gl_Position = u_projection * u_view * worldPosition;
        }
        `;

        const fsSource = `#version 300 es
        precision highp float;

        in vec2 v_uv;
        in vec3 v_normal;
        in vec3 v_worldPos;

        uniform sampler2D u_texture;
        uniform bool u_useTexture;
        uniform bool u_isGroundGrid;
        uniform vec2 u_uvScale;

        uniform vec3 u_baseColor;
        uniform vec3 u_emissive;
        uniform float u_specularStrength;
        uniform float u_shininess;
        uniform float u_opacity;
        uniform bool u_unlit;

        uniform vec3 u_lightPos;
        uniform vec3 u_viewPos;
        uniform vec3 u_lightColor;
        uniform vec3 u_ambientColor;

        uniform vec3 u_fogColor;
        uniform float u_fogNear;
        uniform float u_fogFar;

        out vec4 fragColor;

        void main() {
            vec2 scaledUV = v_uv * u_uvScale;
            vec4 texColor = vec4(1.0);

            if (u_useTexture) {
                texColor = texture(u_texture, scaledUV);
            }

            vec3 objectColor = u_baseColor * texColor.rgb;

            // Patrón procedural de rejilla Synthwave / Asfalto para el suelo
            if (u_isGroundGrid) {
                vec2 grid = abs(fract(v_worldPos.xz * 0.25 - 0.5) - 0.5) / fwidth(v_worldPos.xz * 0.25);
                float line = min(grid.x, grid.y);
                float gridFactor = 1.0 - min(line, 1.0);

                // Sub-rejilla principal cada 4 unidades
                vec2 majorGrid = abs(fract(v_worldPos.xz * 0.05 - 0.5) - 0.5) / fwidth(v_worldPos.xz * 0.05);
                float majorLine = 1.0 - min(min(majorGrid.x, majorGrid.y), 1.0);

                vec3 gridColor = mix(vec3(0.12, 0.22, 0.45), vec3(0.0, 0.85, 1.0), majorLine * 0.65);
                objectColor = mix(objectColor, gridColor, max(gridFactor * 0.38, majorLine * 0.65));
            }

            vec3 finalColor;

            if (u_unlit) {
                finalColor = objectColor + u_emissive;
            } else {
                // Iluminación Phong / Blinn-Phong
                vec3 norm = normalize(v_normal);
                vec3 lightDir = normalize(u_lightPos - v_worldPos);

                // Difusa (con ligero wrap para evitar sombras completamente negras)
                float diff = max(dot(norm, lightDir), 0.0);
                vec3 diffuse = diff * u_lightColor;

                // Especular
                vec3 viewDir = normalize(u_viewPos - v_worldPos);
                vec3 halfDir = normalize(lightDir + viewDir);
                float spec = pow(max(dot(norm, halfDir), 0.0), u_shininess);
                vec3 specular = u_specularStrength * spec * u_lightColor;

                finalColor = (u_ambientColor + diffuse) * objectColor + specular + u_emissive;
            }

            // Niebla atmosférica suave con la distancia a la cámara
            float dist = length(u_viewPos - v_worldPos);
            float fogFactor = clamp((dist - u_fogNear) / (u_fogFar - u_fogNear), 0.0, 1.0);
            finalColor = mix(finalColor, u_fogColor, fogFactor);

            fragColor = vec4(finalColor, texColor.a * u_opacity);
        }
        `;

        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fsSource);

        const program = gl.createProgram();
        gl.attachShader(program, vertexShader);
        gl.attachShader(program, fragmentShader);
        gl.linkProgram(program);

        if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
            const info = gl.getProgramInfoLog(program);
            throw new Error('Error al enlazar programa WebGL2: ' + info);
        }

        return program;
    }

    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);

        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            const info = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            throw new Error('Error compilando shader GLSL ES 3.00: ' + info);
        }
        return shader;
    }

    getUniformLocations() {
        const gl = this.gl;
        const p = this.program;
        return {
            u_model: gl.getUniformLocation(p, 'u_model'),
            u_view: gl.getUniformLocation(p, 'u_view'),
            u_projection: gl.getUniformLocation(p, 'u_projection'),
            u_texture: gl.getUniformLocation(p, 'u_texture'),
            u_useTexture: gl.getUniformLocation(p, 'u_useTexture'),
            u_isGroundGrid: gl.getUniformLocation(p, 'u_isGroundGrid'),
            u_uvScale: gl.getUniformLocation(p, 'u_uvScale'),
            u_baseColor: gl.getUniformLocation(p, 'u_baseColor'),
            u_emissive: gl.getUniformLocation(p, 'u_emissive'),
            u_specularStrength: gl.getUniformLocation(p, 'u_specularStrength'),
            u_shininess: gl.getUniformLocation(p, 'u_shininess'),
            u_opacity: gl.getUniformLocation(p, 'u_opacity'),
            u_unlit: gl.getUniformLocation(p, 'u_unlit'),
            u_lightPos: gl.getUniformLocation(p, 'u_lightPos'),
            u_viewPos: gl.getUniformLocation(p, 'u_viewPos'),
            u_lightColor: gl.getUniformLocation(p, 'u_lightColor'),
            u_ambientColor: gl.getUniformLocation(p, 'u_ambientColor'),
            u_fogColor: gl.getUniformLocation(p, 'u_fogColor'),
            u_fogNear: gl.getUniformLocation(p, 'u_fogNear'),
            u_fogFar: gl.getUniformLocation(p, 'u_fogFar')
        };
    }

    /**
     * Renderiza la escena completa desde el punto de vista de la cámara.
     */
    render(scene, camera) {
        const gl = this.gl;
        const locs = this.uniformLocations;

        // 1. Actualizar jerarquía de matrices del grafo de escena y cámara
        scene.updateMatrixWorld();
        camera.updateViewMatrix();

        // 2. Limpiar buffers de color y profundidad
        const bg = scene.backgroundColor;
        gl.clearColor(bg[0], bg[1], bg[2], bg[3]);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

        gl.useProgram(this.program);

        // 3. Subir uniforms globales de cámara e iluminación
        gl.uniformMatrix4fv(locs.u_view, false, camera.viewMatrix.elements);
        gl.uniformMatrix4fv(locs.u_projection, false, camera.projectionMatrix.elements);
        gl.uniform3f(locs.u_viewPos, camera.position.x, camera.position.y, camera.position.z);
        gl.uniform3f(locs.u_lightPos, scene.lightPosition.x, scene.lightPosition.y, scene.lightPosition.z);
        gl.uniform3f(locs.u_lightColor, scene.lightColor.x, scene.lightColor.y, scene.lightColor.z);
        gl.uniform3f(locs.u_ambientColor, scene.ambientColor.x, scene.ambientColor.y, scene.ambientColor.z);
        gl.uniform3f(locs.u_fogColor, scene.fogColor.x, scene.fogColor.y, scene.fogColor.z);
        gl.uniform1f(locs.u_fogNear, scene.fogNear);
        gl.uniform1f(locs.u_fogFar, scene.fogFar);

        // 4. Recorrer la escena y dibujar cada Mesh visible
        scene.traverse((node) => {
            if (!node.visible || !node.isMesh) return;

            const geometry = node.geometry;
            const material = node.material;

            // Asegurar que la geometría tenga su VAO en GPU
            if (!geometry.vao) {
                geometry.upload(gl);
            }

            // Subir matriz de modelo mundial M_world
            gl.uniformMatrix4fv(locs.u_model, false, node.matrixWorld.elements);

            // Configurar propiedades del material
            gl.uniform3f(locs.u_baseColor, material.color[0], material.color[1], material.color[2]);
            gl.uniform3f(locs.u_emissive, material.emissive[0], material.emissive[1], material.emissive[2]);
            gl.uniform1f(locs.u_specularStrength, material.specularStrength);
            gl.uniform1f(locs.u_shininess, material.shininess);
            gl.uniform1f(locs.u_opacity, material.opacity);
            gl.uniform1i(locs.u_unlit, material.unlit ? 1 : 0);
            gl.uniform1i(locs.u_isGroundGrid, material.isGroundGrid ? 1 : 0);
            gl.uniform2f(locs.u_uvScale, material.uvScale[0], material.uvScale[1]);

            // Textura 2D
            gl.activeTexture(gl.TEXTURE0);
            if (material.texture) {
                gl.bindTexture(gl.TEXTURE_2D, material.texture);
                gl.uniform1i(locs.u_useTexture, 1);
            } else {
                gl.bindTexture(gl.TEXTURE_2D, this.defaultWhiteTexture);
                gl.uniform1i(locs.u_useTexture, 0);
            }
            gl.uniform1i(locs.u_texture, 0);

            // Enlazar VAO y ejecutar llamada de dibujo
            gl.bindVertexArray(geometry.vao);
            if (geometry.indices) {
                gl.drawElements(gl.TRIANGLES, geometry.indexCount, geometry.indexType, 0);
            } else {
                gl.drawArrays(gl.TRIANGLES, 0, geometry.indexCount);
            }
            gl.bindVertexArray(null);
        });
    }
}
