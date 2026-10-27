import { Object3D } from '../core/Object3D.js';

/**
 * Mesh.js
 * Objeto 3D renderizable que combina una Geometría (VAO) y un Material.
 */
export class Mesh extends Object3D {
    constructor(geometry, material, name = 'Mesh') {
        super(name);
        this.geometry = geometry;
        this.material = material;
        this.isMesh = true;
    }
}
