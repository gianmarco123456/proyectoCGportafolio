import { Camera } from './Camera.js';

/**
 * PerspectiveCamera.js
 * Cámara con proyección en perspectiva cónica.
 */
export class PerspectiveCamera extends Camera {
    /**
     * @param {number} fov Campo de visión vertical en grados (ej. 60)
     * @param {number} aspect Relación de aspecto (width / height)
     * @param {number} near Distancia del plano cercano
     * @param {number} far Distancia del plano lejano
     */
    constructor(fov = 60, aspect = 1.77, near = 0.1, far = 200) {
        super();
        this.fov = fov;
        this.aspect = aspect;
        this.near = near;
        this.far = far;
        this.updateProjectionMatrix();
    }

    updateProjectionMatrix() {
        const fovRad = (this.fov * Math.PI) / 180;
        this.projectionMatrix.perspective(fovRad, this.aspect, this.near, this.far);
    }
}
