import { Geometry } from '../core/Geometry.js';

/**
 * PlaneGeometry.js
 * Genera un plano horizontal sobre el plano XZ centrado en el origen, mirando hacia +Y.
 * Ideal para suelos, pistas, carreteras y marcas en el pavimento.
 */
export class PlaneGeometry extends Geometry {
    constructor(width = 10, depth = 10, widthSegments = 1, depthSegments = 1) {
        const halfWidth = width / 2;
        const halfDepth = depth / 2;

        const gridX = Math.floor(widthSegments);
        const gridZ = Math.floor(depthSegments);

        const segmentWidth = width / gridX;
        const segmentDepth = depth / gridZ;

        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        for (let iz = 0; iz <= gridZ; iz++) {
            const z = iz * segmentDepth - halfDepth;
            for (let ix = 0; ix <= gridX; ix++) {
                const x = ix * segmentWidth - halfWidth;

                positions.push(x, 0, z);
                normals.push(0, 1, 0);
                uvs.push(ix / gridX, 1 - (iz / gridZ));
            }
        }

        for (let iz = 0; iz < gridZ; iz++) {
            for (let ix = 0; ix < gridX; ix++) {
                const a = ix + (gridX + 1) * iz;
                const b = ix + (gridX + 1) * (iz + 1);
                const c = (ix + 1) + (gridX + 1) * (iz + 1);
                const d = (ix + 1) + (gridX + 1) * iz;

                // Sentido antihorario mirando desde +Y
                indices.push(a, b, d);
                indices.push(b, c, d);
            }
        }

        super({ positions, normals, uvs, indices });
        this.width = width;
        this.depth = depth;
    }
}
