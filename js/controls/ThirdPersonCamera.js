import { Vector3 } from '../math/Vector3.js';

/**
 * ThirdPersonCamera.js
 * Cámara de persecución en 3ra persona con interpolación suave (Lerp).
 * Fórmula del SKILL.md:
 * P_cam_target = P_car - d * F_car + h * U
 */
export class ThirdPersonCamera {
    /**
     * @param {PerspectiveCamera} camera Instancia de la cámara de perspectiva
     * @param {Object3D} targetNode Nodo del carrito a seguir
     * @param {Object} options Parámetros de distancia, altura y suavizado
     */
    constructor(camera, targetNode, {
        distance = 9.5,
        height = 4.6,
        lookAhead = 2.8,
        smoothFactor = 6.5
    } = {}) {
        this.camera = camera;
        this.targetNode = targetNode;
        this.distance = distance;
        this.height = height;
        this.lookAhead = lookAhead;
        this.smoothFactor = smoothFactor;

        this.currentPosition = new Vector3(0, height, -distance);
        this.currentLookAt = new Vector3(0, 1.0, 0);

        this.desiredPosition = new Vector3();
        this.desiredLookAt = new Vector3();
        this.forward = new Vector3();

        this.snapToTarget();
    }

    /**
     * Coloca la cámara instantáneamente detrás del carrito al iniciar.
     */
    snapToTarget() {
        const theta = this.targetNode.rotation.y;
        this.forward.set(Math.sin(theta), 0, Math.cos(theta));

        this.currentPosition.set(
            this.targetNode.position.x - this.distance * this.forward.x,
            this.targetNode.position.y + this.height,
            this.targetNode.position.z - this.distance * this.forward.z
        );

        this.currentLookAt.set(
            this.targetNode.position.x + this.lookAhead * this.forward.x,
            this.targetNode.position.y + 1.1,
            this.targetNode.position.z + this.lookAhead * this.forward.z
        );

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }

    /**
     * Actualiza la posición y orientación de la cámara en cada frame con Lerp.
     * @param {number} dt Delta time en segundos
     */
    update(dt) {
        const theta = this.targetNode.rotation.y;
        // Vector frontal del auto F_car = (sin(theta), 0, cos(theta))
        this.forward.set(Math.sin(theta), 0, Math.cos(theta));

        // P_cam_target = P_car - d * F_car + h * U
        this.desiredPosition.set(
            this.targetNode.position.x - this.distance * this.forward.x,
            this.targetNode.position.y + this.height,
            this.targetNode.position.z - this.distance * this.forward.z
        );

        // Punto de mira ligeramente adelante del carrito para mejor visibilidad de la pista
        this.desiredLookAt.set(
            this.targetNode.position.x + this.lookAhead * this.forward.x,
            this.targetNode.position.y + 1.1,
            this.targetNode.position.z + this.lookAhead * this.forward.z
        );

        const alpha = Math.min(1.0, this.smoothFactor * dt);
        this.currentPosition.lerp(this.desiredPosition, alpha);
        this.currentLookAt.lerp(this.desiredLookAt, alpha * 1.4);

        this.camera.position.copy(this.currentPosition);
        this.camera.lookAt(this.currentLookAt);
    }
}
