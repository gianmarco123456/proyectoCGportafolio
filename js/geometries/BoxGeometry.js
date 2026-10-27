import { Geometry } from '../core/Geometry.js';

/**
 * BoxGeometry.js
 * Genera un cubo o paralelepípedo centrado en el origen con normales planas por cara
 * y coordenadas UV completas (0..1) en cada una de sus 6 caras.
 */
export class BoxGeometry extends Geometry {
    constructor(width = 1, height = 1, depth = 1) {
        const w = width / 2;
        const h = height / 2;
        const d = depth / 2;

        // 24 vértices (4 por cara) para que cada cara tenga normales y UVs independientes
        const positions = [
            // Frente (+Z)
            -w, -h,  d,   w, -h,  d,   w,  h,  d,  -w,  h,  d,
            // Atrás (-Z)
             w, -h, -d,  -w, -h, -d,  -w,  h, -d,   w,  h, -d,
            // Arriba (+Y)
            -w,  h,  d,   w,  h,  d,   w,  h, -d,  -w,  h, -d,
            // Abajo (-Y)
            -w, -h, -d,   w, -h, -d,   w, -h,  d,  -w, -h,  d,
            // Derecha (+X)
             w, -h,  d,   w, -h, -d,   w,  h, -d,   w,  h,  d,
            // Izquierda (-X)
            -w, -h, -d,  -w, -h,  d,  -w,  h,  d,  -w,  h, -d
        ];

        const normals = [
            // Frente (+Z)
             0,  0,  1,   0,  0,  1,   0,  0,  1,   0,  0,  1,
            // Atrás (-Z)
             0,  0, -1,   0,  0, -1,   0,  0, -1,   0,  0, -1,
            // Arriba (+Y)
             0,  1,  0,   0,  1,  0,   0,  1,  0,   0,  1,  0,
            // Abajo (-Y)
             0, -1,  0,   0, -1,  0,   0, -1,  0,   0, -1,  0,
            // Derecha (+X)
             1,  0,  0,   1,  0,  0,   1,  0,  0,   1,  0,  0,
            // Izquierda (-X)
            -1,  0,  0,  -1,  0,  0,  -1,  0,  0,  -1,  0,  0
        ];

        // UVs invertidas en V (1 -> 0) para que las imágenes PNG en WebGL se vean al derecho
        const uvs = [
            // Frente
            0, 1,  1, 1,  1, 0,  0, 0,
            // Atrás
            0, 1,  1, 1,  1, 0,  0, 0,
            // Arriba
            0, 1,  1, 1,  1, 0,  0, 0,
            // Abajo
            0, 1,  1, 1,  1, 0,  0, 0,
            // Derecha
            0, 1,  1, 1,  1, 0,  0, 0,
            // Izquierda
            0, 1,  1, 1,  1, 0,  0, 0
        ];

        const indices = [];
        for (let i = 0; i < 6; i++) {
            const offset = i * 4;
            indices.push(
                offset, offset + 1, offset + 2,
                offset, offset + 2, offset + 3
            );
        }

        super({ positions, normals, uvs, indices });
        this.width = width;
        this.height = height;
        this.depth = depth;
    }
}
