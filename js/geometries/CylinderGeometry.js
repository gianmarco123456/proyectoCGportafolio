import { Geometry } from '../core/Geometry.js';

/**
 * CylinderGeometry.js
 * Genera un cilindro 3D (con tapas superior e inferior) centrado en el origen.
 * Por defecto se extiende a lo largo del eje Y; si orientAlongX = true, se genera
 * directamente alineado con el eje X (ideal para ruedas de vehículos que giran sobre X).
 */
export class CylinderGeometry extends Geometry {
    constructor(radiusTop = 0.5, radiusBottom = 0.5, height = 1, radialSegments = 20, orientAlongX = true) {
        const positions = [];
        const normals = [];
        const uvs = [];
        const indices = [];

        const halfHeight = height / 2;
        let indexOffset = 0;

        // Auxiliar para insertar un vértice (rotado al eje X si orientAlongX es true)
        const pushVertex = (x, y, z, nx, ny, nz, u, v) => {
            if (orientAlongX) {
                // Intercambiamos el eje axial Y con X (rotación de -90° en Z)
                positions.push(y, x, z);
                normals.push(ny, nx, nz);
            } else {
                positions.push(x, y, z);
                normals.push(nx, ny, nz);
            }
            uvs.push(u, v);
        };

        // 1. Cuerpo cilíndrico lateral (Torso)
        const slope = (radiusBottom - radiusTop) / height;
        for (let yStep = 0; yStep <= 1; yStep++) {
            const v = yStep;
            const y = v * height - halfHeight;
            const radius = v * (radiusTop - radiusBottom) + radiusBottom;

            for (let xStep = 0; xStep <= radialSegments; xStep++) {
                const u = xStep / radialSegments;
                const theta = u * Math.PI * 2;

                const sinTheta = Math.sin(theta);
                const cosTheta = Math.cos(theta);

                const vx = radius * sinTheta;
                const vz = radius * cosTheta;

                const nLen = Math.hypot(sinTheta, slope, cosTheta);
                const nx = sinTheta / nLen;
                const ny = slope / nLen;
                const nz = cosTheta / nLen;

                pushVertex(vx, y, vz, nx, ny, nz, u, 1 - v);
            }
        }

        const stride = radialSegments + 1;
        for (let xStep = 0; xStep < radialSegments; xStep++) {
            const a = xStep;
            const b = xStep + stride;
            const c = xStep + stride + 1;
            const d = xStep + 1;

            if (orientAlongX) {
                indices.push(a, b, d);
                indices.push(b, c, d);
            } else {
                indices.push(a, d, b);
                indices.push(b, d, c);
            }
        }
        indexOffset = (radialSegments + 1) * 2;

        // 2. Tapa superior (+halfHeight) y tapa inferior (-halfHeight)
        const buildCap = (top) => {
            const radius = top ? radiusTop : radiusBottom;
            const sign = top ? 1 : -1;
            const y = halfHeight * sign;
            const centerIndex = indexOffset;

            pushVertex(0, y, 0, 0, sign, 0, 0.5, 0.5);
            indexOffset++;

            for (let xStep = 0; xStep <= radialSegments; xStep++) {
                const u = xStep / radialSegments;
                const theta = u * Math.PI * 2;
                const cosTheta = Math.cos(theta);
                const sinTheta = Math.sin(theta);

                const vx = radius * sinTheta;
                const vz = radius * cosTheta;

                pushVertex(
                    vx, y, vz,
                    0, sign, 0,
                    (cosTheta * 0.5) + 0.5,
                    (sinTheta * 0.5 * sign) + 0.5
                );
                indexOffset++;
            }

            for (let xStep = 0; xStep < radialSegments; xStep++) {
                const c = centerIndex;
                const i1 = centerIndex + 1 + xStep;
                const i2 = centerIndex + 1 + xStep + 1;

                const flip = orientAlongX ? !top : top;
                if (flip) {
                    indices.push(c, i1, i2);
                } else {
                    indices.push(c, i2, i1);
                }
            }
        };

        if (radiusTop > 0) buildCap(true);
        if (radiusBottom > 0) buildCap(false);

        super({ positions, normals, uvs, indices });
    }
}
