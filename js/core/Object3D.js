import { Vector3 } from '../math/Vector3.js';
import { Matrix4 } from '../math/Matrix4.js';

/**
 * Object3D.js
 * Nodo base del grafo de escena (Scene Graph).
 * Maneja transformaciones locales (position, rotation, scale) y jerarquía padre-hijo.
 */
export class Object3D {
    constructor(name = 'Object3D') {
        this.name = name;
        this.position = new Vector3(0, 0, 0);
        this.rotation = new Vector3(0, 0, 0); // Ángulos de Euler en radianes (X, Y, Z)
        this.scale = new Vector3(1, 1, 1);

        this.matrixLocal = new Matrix4();
        this.matrixWorld = new Matrix4();

        this.parent = null;
        this.children = [];
        this.visible = true;
        this.userData = {};
    }

    /**
     * Añade un nodo hijo a este Object3D.
     */
    add(child) {
        if (child === this) return this;
        if (child.parent !== null) {
            child.parent.remove(child);
        }
        child.parent = this;
        this.children.push(child);
        return this;
    }

    /**
     * Remueve un nodo hijo de este Object3D.
     */
    remove(child) {
        const index = this.children.indexOf(child);
        if (index !== -1) {
            child.parent = null;
            this.children.splice(index, 1);
        }
        return this;
    }

    /**
     * Actualiza la matriz local M_local = T * R * S
     */
    updateMatrixLocal() {
        this.matrixLocal.compose(this.position, this.rotation, this.scale);
    }

    /**
     * Actualiza la matriz mundial M_world = M_parent_world * M_local
     * y propaga recursivamente a todos los hijos.
     */
    updateMatrixWorld(force = false) {
        this.updateMatrixLocal();

        if (this.parent === null) {
            this.matrixWorld.copy(this.matrixLocal);
        } else {
            this.matrixWorld.multiplyMatrices(this.parent.matrixWorld, this.matrixLocal);
        }

        for (let i = 0; i < this.children.length; i++) {
            this.children[i].updateMatrixWorld(force);
        }
    }

    /**
     * Recorre recursivamente el árbol de nodos ejecutando un callback.
     */
    traverse(callback) {
        callback(this);
        for (let i = 0; i < this.children.length; i++) {
            this.children[i].traverse(callback);
        }
    }
}
