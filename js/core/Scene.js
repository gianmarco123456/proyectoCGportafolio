import { Object3D } from './Object3D.js';
import { Vector3 } from '../math/Vector3.js';

/**
 * Scene.js
 * Nodo raíz del grafo de escena 3D. Contiene configuración ambiental e iluminación global.
 */
export class Scene extends Object3D {
    constructor() {
        super('Scene');
        // Color de fondo estilo Synthwave / Nocturno limpio (R, G, B, A)
        this.backgroundColor = [0.05, 0.05, 0.12, 1.0];

        // Parámetros de iluminación global para el shader Blinn-Phong
        this.lightPosition = new Vector3(30, 50, 30);
        this.lightColor = new Vector3(1.0, 0.98, 0.95);
        this.ambientColor = new Vector3(0.32, 0.30, 0.45);

        // Parámetros de niebla atmosférica a distancia para estética synthwave limpia
        this.fogColor = new Vector3(0.05, 0.05, 0.12);
        this.fogNear = 45.0;
        this.fogFar = 135.0;
    }
}
