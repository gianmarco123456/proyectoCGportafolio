/**
 * Matrix4.js
 * Matrices homogéneas 4x4 en orden Column-Major (estándar nativo de WebGL / OpenGL).
 * Soporta M = T * R * S, proyecciones de perspectiva y matriz de vista (lookAt).
 */
export class Matrix4 {
    constructor() {
        this.elements = new Float32Array(16);
        this.identity();
    }

    identity() {
        const te = this.elements;
        te[0] = 1; te[4] = 0; te[8] = 0;  te[12] = 0;
        te[1] = 0; te[5] = 1; te[9] = 0;  te[13] = 0;
        te[2] = 0; te[6] = 0; te[10] = 1; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    copy(m) {
        this.elements.set(m.elements);
        return this;
    }

    clone() {
        const m = new Matrix4();
        m.copy(this);
        return m;
    }

    /**
     * Multiplica esta matriz por m (this = this * m)
     */
    multiply(m) {
        return this.multiplyMatrices(this, m);
    }

    /**
     * Establece esta matriz como a * b
     */
    multiplyMatrices(a, b) {
        const ae = a.elements;
        const be = b.elements;
        const te = this.elements;

        const a11 = ae[0], a12 = ae[4], a13 = ae[8],  a14 = ae[12];
        const a21 = ae[1], a22 = ae[5], a23 = ae[9],  a24 = ae[13];
        const a31 = ae[2], a32 = ae[6], a33 = ae[10], a34 = ae[14];
        const a41 = ae[3], a42 = ae[7], a43 = ae[11], a44 = ae[15];

        const b11 = be[0], b12 = be[4], b13 = be[8],  b14 = be[12];
        const b21 = be[1], b22 = be[5], b23 = be[9],  b24 = be[13];
        const b31 = be[2], b32 = be[6], b33 = be[10], b34 = be[14];
        const b41 = be[3], b42 = be[7], b43 = be[11], b44 = be[15];

        te[0] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
        te[4] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
        te[8] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
        te[12] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;

        te[1] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
        te[5] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
        te[9] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
        te[13] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;

        te[2] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
        te[6] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
        te[10] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
        te[14] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;

        te[3] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
        te[7] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
        te[11] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
        te[15] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;

        return this;
    }

    makeTranslation(x, y, z) {
        const te = this.elements;
        te[0] = 1; te[4] = 0; te[8] = 0;  te[12] = x;
        te[1] = 0; te[5] = 1; te[9] = 0;  te[13] = y;
        te[2] = 0; te[6] = 0; te[10] = 1; te[14] = z;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    makeScale(x, y, z) {
        const te = this.elements;
        te[0] = x; te[4] = 0; te[8] = 0;  te[12] = 0;
        te[1] = 0; te[5] = y; te[9] = 0;  te[13] = 0;
        te[2] = 0; te[6] = 0; te[10] = z; te[14] = 0;
        te[3] = 0; te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    makeRotationX(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        const te = this.elements;
        te[0] = 1; te[4] = 0;  te[8] = 0;  te[12] = 0;
        te[1] = 0; te[5] = c;  te[9] = -s; te[13] = 0;
        te[2] = 0; te[6] = s;  te[10] = c; te[14] = 0;
        te[3] = 0; te[7] = 0;  te[11] = 0; te[15] = 1;
        return this;
    }

    makeRotationY(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        const te = this.elements;
        te[0] = c;  te[4] = 0; te[8] = s;  te[12] = 0;
        te[1] = 0;  te[5] = 1; te[9] = 0;  te[13] = 0;
        te[2] = -s; te[6] = 0; te[10] = c; te[14] = 0;
        te[3] = 0;  te[7] = 0; te[11] = 0; te[15] = 1;
        return this;
    }

    makeRotationZ(theta) {
        const c = Math.cos(theta), s = Math.sin(theta);
        const te = this.elements;
        te[0] = c; te[4] = -s; te[8] = 0;  te[12] = 0;
        te[1] = s; te[5] = c;  te[9] = 0;  te[13] = 0;
        te[2] = 0; te[6] = 0;  te[10] = 1; te[14] = 0;
        te[3] = 0; te[7] = 0;  te[11] = 0; te[15] = 1;
        return this;
    }

    translate(x, y, z) {
        const m = new Matrix4().makeTranslation(x, y, z);
        return this.multiply(m);
    }

    rotateX(theta) {
        const m = new Matrix4().makeRotationX(theta);
        return this.multiply(m);
    }

    rotateY(theta) {
        const m = new Matrix4().makeRotationY(theta);
        return this.multiply(m);
    }

    rotateZ(theta) {
        const m = new Matrix4().makeRotationZ(theta);
        return this.multiply(m);
    }

    scale(x, y, z) {
        const m = new Matrix4().makeScale(x, y, z);
        return this.multiply(m);
    }

    /**
     * Compone la matriz de transformación local: M = T * Ry * Rx * Rz * S
     * El orden YXZ de Euler es ideal para vehículos y cámaras terrestres.
     */
    compose(position, rotation, scale) {
        this.identity();
        this.makeTranslation(position.x, position.y, position.z);
        if (rotation.y !== 0) this.rotateY(rotation.y);
        if (rotation.x !== 0) this.rotateX(rotation.x);
        if (rotation.z !== 0) this.rotateZ(rotation.z);
        if (scale.x !== 1 || scale.y !== 1 || scale.z !== 1) {
            this.scale(scale.x, scale.y, scale.z);
        }
        return this;
    }

    /**
     * Construye una matriz de proyección en perspectiva (frustum simétrico).
     * @param {number} fovRad Campo de visión vertical en radianes
     * @param {number} aspect Relación de aspecto (width / height)
     * @param {number} near Plano cercano
     * @param {number} far Plano lejano
     */
    perspective(fovRad, aspect, near, far) {
        const f = 1.0 / Math.tan(fovRad / 2);
        const nf = 1 / (near - far);
        const te = this.elements;

        te[0] = f / aspect; te[4] = 0; te[8] = 0;                   te[12] = 0;
        te[1] = 0;          te[5] = f; te[9] = 0;                   te[13] = 0;
        te[2] = 0;          te[6] = 0; te[10] = (far + near) * nf;  te[14] = (2 * far * near) * nf;
        te[3] = 0;          te[7] = 0; te[11] = -1;                 te[15] = 0;

        return this;
    }

    /**
     * Construye una matriz de vista (View Matrix) mirando desde `eye` hacia `target` con vector `up`.
     */
    lookAt(eye, target, up) {
        const te = this.elements;

        let zx = eye.x - target.x;
        let zy = eye.y - target.y;
        let zz = eye.z - target.z;
        let len = Math.hypot(zx, zy, zz);

        if (len === 0) {
            zz = 1;
        } else {
            len = 1 / len;
            zx *= len;
            zy *= len;
            zz *= len;
        }

        let xx = up.y * zz - up.z * zy;
        let xy = up.z * zx - up.x * zz;
        let xz = up.x * zy - up.y * zx;
        len = Math.hypot(xx, xy, xz);

        if (len === 0) {
            xx = 0; xy = 0; xz = 0;
        } else {
            len = 1 / len;
            xx *= len;
            xy *= len;
            xz *= len;
        }

        let yx = zy * xz - zz * xy;
        let yy = zz * xx - zx * xz;
        let yz = zx * xy - zy * xx;
        len = Math.hypot(yx, yy, yz);

        if (len === 0) {
            yx = 0; yy = 0; yz = 0;
        } else {
            len = 1 / len;
            yx *= len;
            yy *= len;
            yz *= len;
        }

        te[0] = xx; te[4] = xy; te[8]  = xz; te[12] = -(xx * eye.x + xy * eye.y + xz * eye.z);
        te[1] = yx; te[5] = yy; te[9]  = yz; te[13] = -(yx * eye.x + yy * eye.y + yz * eye.z);
        te[2] = zx; te[6] = zy; te[10] = zz; te[14] = -(zx * eye.x + zy * eye.y + zz * eye.z);
        te[3] = 0;  te[7] = 0;  te[11] = 0;  te[15] = 1;

        return this;
    }
}
