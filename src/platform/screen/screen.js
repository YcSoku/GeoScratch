import getDevice from "../context/device.js"
import { Texture } from "../texture/texture.js"

/**
 * Information about the canvas and its GPU context.
 *
 * @typedef {Object} ScreenDescription
 * @property {HTMLCanvasElement} canvas - The HTML canvas element.
 * @property {number} [sampleCount] - The sample count, which can be 1 or 4.
 * @property {GPUCanvasAlphaMode} [alphaMode]
 */

class Screen {
    
    /**
     * @param {ScreenDescription} description 
     */
    constructor(description) {

        this.canvas = description.canvas

        this.sampleCount = description.sampleCount ? description.sampleCount : 1

        this.alphaMode = description.alphaMode ? description.alphaMode : "premultiplied"

        this.context = description.canvas.getContext("webgpu")
        this.presentationFormat = navigator.gpu.getPreferredCanvasFormat()
        this.context.configure({
            device: getDevice(),
            format: this.presentationFormat,
            alphaMode: this.alphaMode
        })
        /**
         * @type {Array<{texture: Texture, multiplier: number[]}>}
         */
        this.screenDependentTextures = []

        this.screenDependentElements = []
        
        this.renderTarget = Texture.create({
            name: 'Texture (Canvas)',
            format: this.presentationFormat,
            resource: {
                canvasTexture: () => this.context.getCurrentTexture(),
                dataType: 'canvasTexture'
            }
        })

        this.onWindowResize()
        window.addEventListener('resize', () => this.onWindowResize())
    }

    /**
     * @param {ScreenDescription} description 
     */
    static create(description) {

        return new Screen(description)
    }

    getCurrentCanvasTexture() {

        return this.renderTarget
    }

    /**
     * 
     * @param {string} [name] 
     * @param {GPUTextureFormat} [format] 
     * @param {number[]} [multiplier = [1, 1]]
     */
    createScreenDependentTexture(name, format, multiplier = [1, 1]) {
        
        const texture = Texture.create({
            name: name,
            format: format,
            resource: { size: () => [this.canvas.width * multiplier[0], this.canvas.height * multiplier[1]] }
        })

        this.addScreenDependentTexture(texture, multiplier)
        
        return texture
    }

    /**
     * 
     * @param {Texture} texture 
     * @param {number[]} [multiplier = [1, 1]]
     * @returns {Screen}
     */
    addScreenDependentTexture(texture, multiplier = [1, 1]) {

        this.screenDependentTextures.push({texture, multiplier})

        return this
    }

    addScreenDependentElement(element) {

        this.screenDependentElements.push(element)

        return this
    }

    onWindowResize() {
        
        const device = getDevice()

        let width, height
        width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, this.canvas.clientWidth)) * window.devicePixelRatio
        height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, this.canvas.clientHeight)) * window.devicePixelRatio

        this.canvas.width = width
        this.canvas.height = height

        if (this.sampleCount > 1) {
        }

        this.screenDependentTextures.forEach(textureContent => {
            textureContent.texture.reset({
                resource: { size: () => [ width * textureContent.multiplier[0], height * textureContent.multiplier[1] ] }
            })
        })

        this.screenDependentElements.forEach(element => {
            
            element.onWindowResize & element.onWindowResize()
        })
    }

    swap() {

        this.renderTarget.reset()
    }
}

export {
    Screen
}