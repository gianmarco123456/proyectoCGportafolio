/**
 * TextureLoader.js
 * Cargador de texturas 2D para WebGL 2.0.
 * Permite cargar imágenes externas (PNG/JPG) con mipmaps y filtrado trilineal,
 * además de contar con un respaldo procedural en canvas si la imagen aún está cargando.
 */
export class TextureLoader {
    constructor(gl) {
        this.gl = gl;
        this.cache = new Map();
    }

    /**
     * Carga una imagen desde una URL y retorna inmediatamente un objeto WebGLTexture.
     * Mientras la imagen carga de forma asíncrona, muestra un placeholder limpio.
     * @param {string} url Ruta del archivo de textura (ej. 'texturas/github.png')
     * @returns {WebGLTexture}
     */
    load(url) {
        if (this.cache.has(url)) {
            return this.cache.get(url);
        }

        const gl = this.gl;
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);

        // Pixel temporal mientras carga la imagen desde disco/servidor HTTP
        gl.texImage2D(
            gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0,
            gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([40, 50, 90, 255])
        );

        const image = new Image();
        image.crossOrigin = 'anonymous';
        image.onload = () => {
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
            gl.texImage2D(
                gl.TEXTURE_2D, 0, gl.RGBA,
                gl.RGBA, gl.UNSIGNED_BYTE, image
            );
            gl.generateMipmap(gl.TEXTURE_2D);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
            gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        };

        image.onerror = () => {
            console.warn(`No se pudo cargar la textura en ${url}, generando textura de respaldo.`);
            const fallbackCanvas = this.createFallbackCanvas(url);
            gl.bindTexture(gl.TEXTURE_2D, texture);
            gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, fallbackCanvas);
            gl.generateMipmap(gl.TEXTURE_2D);
        };

        image.src = url;
        this.cache.set(url, texture);
        return texture;
    }

    /**
     * Genera un canvas 2D de respaldo en caso de error de red.
     */
    createFallbackCanvas(label) {
        const canvas = document.createElement('canvas');
        canvas.width = 256;
        canvas.height = 256;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#1a1f3c';
        ctx.fillRect(0, 0, 256, 256);
        ctx.strokeStyle = '#00e5ff';
        ctx.lineWidth = 10;
        ctx.strokeRect(10, 10, 236, 236);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 28px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        const name = label.split('/').pop().replace('.png', '').toUpperCase();
        ctx.fillText(name, 128, 128);
        return canvas;
    }
}
