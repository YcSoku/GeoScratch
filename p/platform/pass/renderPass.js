import director from "../director/director.js"
import { Binding } from "../binding/binding.js"
import { Texture } from "../texture/texture.js"
import { ScratchObject } from '../../core/object/object'
import { RenderPipeline } from "../pipeline/renderPipeline.js"

/**
 * @typedef {Object} RenderPassDescription
 * @property {string} name
 * @property {Array<{colorResource: Texture, clearValue?: Array<number>, loadOp?: 'clear' | 'load', storeOp?: 'store'| 'discard'}>} colorAttachments
 * @property {{depthStencilResource: Texture, depthClearValue?: number, depthLoadOp?: 'clear' | 'load', depthStoreOp?: 'store' | 'discard'}} [depthStencilAttachment]
 */

export class RenderPass extends ScratchObject {

    /**
     * @param {RenderPassDescription} description 
     */
    constructor(description) {

        super()
        
        this.name = description.name
        this.colorDescription = description.colorAttachments
        this.depthStencilDescription = description.depthStencilAttachment
        /**
         * @type {Array<GPURenderPassColorAttachment>}
         */
        this.colorAttachments = new Array(this.colorDescription.length)
        this.depthStencilAttachment = undefined

        /**
         * @type {Array<{pipeline: RenderPipeline, binding: Binding}>}
         */
        this.drawcalls = []

        this.pass = null

        this.executable = false
        
        director.addToUpdateList(this)
    }

    /**
     * @param {RenderPassDescription} description 
     */
    static create(description) {
        
        return new RenderPass(description)
    }

    makeColorFormats() {

        const colorFormats = new Array(this.colorDescription.length)
        this.colorDescription.forEach((description, index) => {
            colorFormats[index] = description.colorResource.format
        })
        
        return colorFormats
    }

    makeDepthStencilFormat() {

        if (!this.depthStencilDescription) return undefined
        return this.depthStencilDescription.depthStencilResource.format
    }

    updateColorAttachments() {

        this.colorDescription.forEach((description, index) => {

            this.colorAttachments[index] = {
                view: description.colorResource.view(),
                loadOp: description.loadOp ? description.loadOp : 'clear',
                storeOp: description.storeOp ? description.storeOp : 'store',
                clearValue: description.clearValue ? description.clearValue : [0.0, 0.0, 0.0, 0.0],
            }
        })
    }

    addColorAttachments() {

        this.updateColorAttachments()

        this.colorDescription.forEach((description, index) => {

            description.colorResource.registerCallback(() => {
                this.colorAttachments[index].view = description.colorResource.view()
            })
        })
    }

    updateDepthStencilAttachment() {

        this.depthStencilAttachment = {
            view: this.depthStencilDescription.depthStencilResource.view(),
            depthLoadOp: this.depthStencilDescription.depthLoadOp ? this.depthStencilDescription.depthLoadOp : 'clear',
            depthStoreOp: this.depthStencilDescription.depthStoreOp ? this.depthStencilDescription.depthStoreOp : 'store',
            depthClearValue: this.depthStencilDescription.depthClearValue ? this.depthStencilDescription.depthClearValue : 1.0,
        }
    }

    addDepthStencilAttachment() {

        this.updateDepthStencilAttachment()

        this.depthStencilDescription.depthStencilResource.registerCallback(() => {
            this.depthStencilAttachment.view = this.depthStencilDescription.depthStencilResource.view()
        })
    }

    tryMakeUpdate() {

        const colorOK = !this.colorDescription.some(description => description.colorResource.texture === undefined)
        const depthStencilOK = this.depthStencilDescription === undefined ? true : this.depthStencilDescription.depthStencilResource.texture !== undefined
        return colorOK && depthStencilOK
    }

    update() {

        this.executable = false

        if (!this.tryMakeUpdate()) {

            director.addToNextUpdateList(this)

        } else {

            this.addColorAttachments()
            this.depthStencilDescription && this.addDepthStencilAttachment()
    
            this.passDescription = {
                label: `Render pass (${this.name})`,
                colorAttachments: this.colorAttachments,
                ...(this.depthStencilDescription && {
                    depthStencilAttachment: this.depthStencilAttachment
                })
            }

            this.executable = true
        }
    }

    /**
     * 
     * @param {RenderPipeline} pipeline 
     * @param {Binding} binding 
     */
    add(pipeline, binding) {

        // Dependency injection
        pipeline.setDependency(this, binding)

        this.drawcalls.push({ pipeline: pipeline.use(), binding: binding.use() })
        return this
    }

    empty() {

        this.drawcalls.forEach(drawcall => {
            drawcall.binding = drawcall.binding.release()
            drawcall.pipeline = drawcall.pipeline.release()
        })
        this.drawcalls = []
    }

    /**
     * @param {GPUCommandEncoder} encoder 
     */
    execute(encoder) {

        this.pass = encoder.beginRenderPass(this.passDescription)  

        this.drawcalls
        .filter(({ binding, pipeline }) => binding.executable && pipeline.executable)
        .forEach(({ binding, pipeline }) => pipeline.draw(this, binding))

        this.pass.end()
    }

    destroy() {

        this.name = null

        this.colorAttachments.forEach(attachment => {
            attachment.view = null
            attachment.loadOp = null
            attachment.storeOp = null
            attachment.clearValue = null
            attachment.depthSlice = null
            attachment.resolveTarget = null
        })
        this.colorAttachments = null

        this.colorDescription.forEach(description => {
            description.loadOp = null
            description.storeOp = null
            description.clearValue = null
            description.colorResource = description.colorResource.release()
        })
        this.colorDescription = null

        this.depthStencilAttachment.view = null
        this.depthStencilAttachment.depthLoadOp = null
        this.depthStencilAttachment.depthStoreOp = null
        this.depthStencilAttachment.depthClearValue = null

        this.depthStencilDescription.depthLoadOp = null
        this.depthStencilDescription.depthStoreOp = null
        this.depthStencilDescription.depthClearValue = null
        this.depthStencilDescription.depthStencilResource = this.depthStencilDescription.depthStencilResource.release()
        this.depthStencilDescription = null

        this.drawcalls.forEach(drawcall => {
            drawcall.binding = drawcall.binding.release()
            drawcall.pipeline = drawcall.pipeline.release()
        })
        this.drawcalls = null

        this.pass = null
        
        this.executable = null

        super.destroy()

        return null
    }
}

/**
 * @param {RenderPassDescription} description 
 */
export function renderPass(description) {

    return new RenderPass(description)
}
