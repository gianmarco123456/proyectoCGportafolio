import { Object3D } from '../core/Object3D.js';
import { Matrix4 } from '../math/Matrix4.js';
import { Vector3 } from '../math/Vector3.js';

/**
 * Camera.js
 * Clase base para cámaras 3D. Gestiona la matriz de vista (viewMatrix) y de proyección (projectionMatrix).
 */
export class Camera extends Object3D {
    constructor() {
        super('Camera');
        this.viewMatrix = new Matrix4();
        this.projectionMatrix = new Matrix4();
        this.target = new Vector3(0, 0, 0);
        this.up = new Vector3(0, 1, 0);
    }

    /**
     * Hace que la cámara apunte hacia un vector objetivo (target) en coordenadas del mundo.
     */
    lookAt(x, y, z) {
        if (x instanceof Vector3) {
            this.target.copy(x);
        } else {
            this.target.set(x, y, z);
        }
        this.updateViewMatrix();
    }

    /**
     * Recalcula la matriz de vista usando lookAt(position, target, up).
     */
    updateViewMatrix() {
        this.viewMatrix.lookAt(this.position, this.target, this.up);
    }
}
