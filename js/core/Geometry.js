/**
 * Geometry.js
 * Contenedor de atributos de vértices (posiciones, normales, coordenadas UV e índices)
 * y gestión de su Vertex Array Object (VAO) en WebGL 2.0.
 */
export class Geometry {
    /**
     * @param {Object} attributes
     * @param {Float32Array|Array<number>} attributes.positions
     * @param {Float32Array|Array<number>} attributes.normals
     * @param {Float32Array|Array<number>} attributes.uvs
     * @param {Uint16Array|Uint32Array|Array<number>} [attributes.indices]
     */
    constructor({ positions, normals, uvs, indices = null }) {
        this.positions = positions instanceof Float32Array ? positions : new Float32Array(positions);
        this.normals = normals instanceof Float32Array ? normals : new Float32Array(normals);
        this.uvs = uvs instanceof Float32Array ? uvs : new Float32Array(uvs);

        if (indices) {
            this.indices = (indices instanceof Uint16Array || indices instanceof Uint32Array)
                ? indices
                : new Uint16Array(indices);
        } else {
            this.indices = null;
        }

        this.vao = null;
        this.indexCount = this.indices ? this.indices.length : this.positions.length / 3;
        this.indexType = null;
    }

    /**
     * Sube los buffers a la GPU y configura el VAO en WebGL2.
     * Layout locations estandarizados:
     * 0: a_position (vec3)
     * 1: a_normal   (vec3)
     * 2: a_uv       (vec2)
     */
    upload(gl) {
        if (this.vao) return this.vao;

        this.vao = gl.createVertexArray();
        gl.bindVertexArray(this.vao);

        // Position Buffer (location = 0)
        const posBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.positions, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(0);
        gl.vertexAttribPointer(0, 3, gl.FLOAT, false, 0, 0);

        // Normal Buffer (location = 1)
        const normBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, normBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.normals, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(1);
        gl.vertexAttribPointer(1, 3, gl.FLOAT, false, 0, 0);

        // UV Buffer (location = 2)
        const uvBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, uvBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, this.uvs, gl.STATIC_DRAW);
        gl.enableVertexAttribArray(2);
        gl.vertexAttribPointer(2, 2, gl.FLOAT, false, 0, 0);

        // Element Array Buffer (Índices)
        if (this.indices) {
            const indexBuffer = gl.createBuffer();
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
            gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, this.indices, gl.STATIC_DRAW);
            this.indexType = (this.indices instanceof Uint32Array) ? gl.UNSIGNED_INT : gl.UNSIGNED_SHORT;
        }

        gl.bindVertexArray(null);
        return this.vao;
    }
}
