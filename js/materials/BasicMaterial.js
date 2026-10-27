/**
 * BasicMaterial.js
 * Material configurable para el motor WebGL2.
 * Soporta color base (RGB), textura 2D, color emisivo, brillo especular y grilla procedural.
 */
export class BasicMaterial {
    /**
     * @param {Object} params
     * @param {Array<number>} [params.color=[1, 1, 1]] Color base RGB (0.0 a 1.0)
     * @param {WebGLTexture|null} [params.texture=null] Textura WebGL2 2D
     * @param {Array<number>} [params.emissive=[0, 0, 0]] Color emisivo adicional RGB
     * @param {number} [params.specularStrength=0.45] Intensidad de reflejo especular
     * @param {number} [params.shininess=32.0] Exponente de brillo Blinn-Phong
     * @param {number} [params.opacity=1.0] Opacidad (0.0 a 1.0)
     * @param {boolean} [params.unlit=false] Si es true, ignora sombras y brilla con su color puro
     * @param {boolean} [params.isGroundGrid=false] Si es true, dibuja la rejilla synthwave en el suelo
     * @param {Array<number>} [params.uvScale=[1, 1]] Escala de repetición de coordenadas UV
     */
    constructor({
        color = [1.0, 1.0, 1.0],
        texture = null,
        emissive = [0.0, 0.0, 0.0],
        specularStrength = 0.45,
        shininess = 32.0,
        opacity = 1.0,
        unlit = false,
        isGroundGrid = false,
        uvScale = [1.0, 1.0]
    } = {}) {
        this.color = color;
        this.texture = texture;
        this.emissive = emissive;
        this.specularStrength = specularStrength;
        this.shininess = shininess;
        this.opacity = opacity;
        this.unlit = unlit;
        this.isGroundGrid = isGroundGrid;
        this.uvScale = uvScale;
    }
}
