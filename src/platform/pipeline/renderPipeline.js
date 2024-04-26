import { Shader } from '../shader/shader.js'
import director from '../director/director.js'
import { Binding } from '../binding/binding.js'
import { RenderPass } from '../pass/renderPass.js'
import { ScratchObject } from '../../core/object/object.js'

/**
 * @typedef {Object} RenderPipelineDescription
 * @property {string} name
 * @property {{module: Shader, vsEntryPoint?: string, fsEntryPoint?: string}} shader
 * @property {Array<{format?: GPUTextureFormat, blend?: GPUBlendState, writeMask?: GPUColorWriteFlags}>} [colorTargetStates]
 * @property {GPUPrimitiveState} [primitive]
 * @property {boolean} [depthTest]
 * @property {boolean} [asBundle]
 */

class RenderPipeline extends ScratchObject {

    /**
     * @param {RenderPipelineDescription} description 
     */
    constructor(description) {

        super()

        this.shader = description.shader.module.use()
        this.name = description.name || 'Render Pipeline'
        this.vsEntryPoint = description.shader.vsEntryPoint || 'vMain'
        this.fsEntryPoint = description.shader.fsEntryPoint || 'fMain'

        /**
         * @type {Array<GPUColorTargetState>}
         */
        this.colorTargetStates = []
        this.colorTargetStateDescriptions = description.colorTargetStates

        /**
         * @type {GPUDepthStencilState}
         */
        this.depthStencilState = undefined

        /**
         * @type {GPUPrimitiveState}
         */
        this.primitive = description.primitive || {
            cullMode: 'none',
            topology: 'triangle-list',
        }
        
        this.depthTest = description.depthTest

        this.layoutDescriptor = undefined
        this.descriptor = undefined

        this.pipelineLayout = undefined
        this.pipeline = undefined

        this.asBundle = description.asBundle !== undefined ? description.asBundle : false
        this.bundleDirty = this.asBundle
        this.renderBundle = undefined

        this.isFinite = false
        this.triggerCount = 0

        this.bindingCase = undefined
        this.executable = false

        director.addToUpdateList(this)
    }

    /**
     * @param {RenderPipelineDescription} description 
     */
    static create(description) {
        return new RenderPipeline(description)
    }

    exportLayoutDescriptor() {

        if (this.layoutDescriptor) return this.layoutDescriptor

        this.layoutDescriptor = {
            label: `Render Pipline Layout (${this.name})`,
            bindGroupLayouts: this.bindingCase.getBindGroupLayouts(),
        }

        this.bindingCase = this.bindingCase.release()

        return this.layoutDescriptor
    }

    exportDescriptor() {

        if (this.descriptor.layout) return this.layoutDescriptor

        this.descriptor.layout = this.pipelineLayout
        this.descriptor.vertex.module = this.shader.shaderModule
        this.descriptor.fragment.module = this.shader.shaderModule

        return this.descriptor
    }

    /**
     * @param {RenderPass} pass
     */
    createTargetState(pass) {

        const colorFormats = pass.makeColorFormats()
        this.colorTargetStates = new Array(colorFormats.length)
        colorFormats.forEach((format, index) => {
            this.colorTargetStates[index] = {
                format: format,
                blend: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].blend : undefined,
                writeMask: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].writeMask: undefined,
            }
        })

        const depthStencilFormat = pass.makeDepthStencilFormat()
        if (depthStencilFormat !== undefined) {
            this.depthTest === undefined && (this.depthTest = true)

            this.depthStencilState = {
                depthCompare: 'less',
                format: depthStencilFormat,
                depthWriteEnabled: this.depthTest,
            }
        }
    }

    /**
     * @param {RenderPass} pass 
     * @param {Binding} binding 
     */
    setDependency(pass, binding) {

        this.bindingCase = binding.use()

        // Create targets' state
        const colorFormats = pass.makeColorFormats()
        this.colorTargetStates = new Array(colorFormats.length)
        colorFormats.forEach((format, index) => {
            this.colorTargetStates[index] = {
                format: format,
                blend: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].blend : undefined,
                writeMask: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].writeMask: undefined,
            }
        })

        // Create depthStencil's state
        const depthStencilFormat = pass.makeDepthStencilFormat()
        if (depthStencilFormat !== undefined) {
            this.depthTest === undefined && (this.depthTest = true)

            this.depthStencilState = {
                depthWriteEnabled: this.depthTest,
                depthCompare: 'less',
                format: depthStencilFormat
            }
        }

        // Set descriptor
        /** @type {GPUPrimitiveState} */
        const primitiveState = {
            topology: this.primitive.topology,
            frontFace: this.primitive.frontFace,
            cullMode: this.primitive.cullMode,
            unclippedDepth: this.primitive.unclippedDepth,
            ...(binding.indexBinding && (this.primitive.topology === 'line-strip' || this.primitive.topology === 'triangle-strip') && {
                stripIndexFormat: binding.indexBinding.buffer.type
            })
        }

        this.descriptor = {
            label: `Render Pipeline (${this.name})`,
            layout: undefined,
            vertex: {
                module: undefined,
                entryPoint: this.vsEntryPoint,
                buffers: binding.getVertexLayouts(),
            },
            fragment: {
                module: undefined,
                entryPoint: this.fsEntryPoint,
                targets: this.colorTargetStates,
            },
            primitive: primitiveState,
            depthStencil: this.depthStencilState,
        }
    }

    createPipeline() {

        director.dispatchEvent({type: 'createPipelineLayout', emitter: this})
        director.dispatchEvent({type: 'createRenderPipelineAsync', emitter: this})
    }

    tryMakeUpdate() {

        if (!this.bindingCase?.executable) return false

        if (!this.shader.isComplete()) return false

        return true
    }

    update() {

        this.executable = false

        if (!this.tryMakeUpdate()) {

            director.addToNextUpdateList(this)

        } else {

            this.createPipeline()
        }
    }

    /**
     * 
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    makeRenderBundle(renderPass, binding) {

        director.dispatchEvent({type: 'createRenderBundle', emitter: this, renderPass, binding})
    }

    /**
     * 
     * @param {GPURenderPassEncoder | GPURenderBundleEncoder} renderPass 
     * @param {Binding} binding 
     */
    executeRenderPass(renderPass, binding) {
        
        binding.setBindGroups(renderPass)
        binding.setVertexBuffers(renderPass)
        renderPass.setPipeline(this.pipeline)

        if (!binding.indexBinding) {
            if (binding.isIndirect) renderPass.drawIndirect(binding.indirectBinding.buffer.buffer, binding.indirectBinding.byteOffset)
            else renderPass.draw(...binding.range())
        } else {
            renderPass.setIndexBuffer(binding.indexBinding.buffer.buffer, binding.indexBinding.buffer.type)
            if (binding.isIndirect) renderPass.drawIndexedIndirect(binding.indirectBinding.buffer.buffer, binding.indirectBinding.byteOffset)
            else renderPass.drawIndexed(...binding.range())
        }
    }

    /**
     * @param {number} counts 
     */
    triggerFiniteTimes(counts) {

        this.isFinite = true
        this.triggerCount = counts

        return this
    }

    /**
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    draw(renderPass, binding) {

        if (this.isFinite && (!this.triggerCount)) return
        else this.triggerCount = Math.max(this.triggerCount - 1, 0)

        if (!this.executable) return
        
        if (this.asBundle) {
            if (this.bundleDirty) this.makeRenderBundle(renderPass, binding)
            renderPass.pass.executeBundles([this.renderBundle])
        } 
        else this.executeRenderPass(renderPass.pass, binding)
    }

    destroy() {

        this.name = null
        this.shader = this.shader.release()
        this.vsEntryPoint = null
        this.fsEntryPoint = null
        
        this.colorTargetStates.forEach(state => {
            state.blend = null
            state.format = null
            state.writeMask = null
        })
        this.colorTargetStates = null

        this.colorTargetStateDescriptions.forEach(description => {
            description.blend = null
            description.format = null
            description.writeMask = null
        })
        this.colorTargetStateDescriptions = null

        this.depthTest = null
        this.depthStencilState = null

        this.primitive = null
        this.layoutDescriptor = null
        this.descriptor = null

        this.pipelineLayout = null
        this.pipeline = null

        this.asBundle = null
        this.bundleDirty = null
        this.renderBundle = null

        this.isFinite = null
        this.triggerCount = null

        this.bindingCase = null
        this.executable = false

        super.destroy()

        return null
    }
}

/**
 * @param {RenderPipelineDescription} description 
 */
function renderPipeline(description) {

    return RenderPipeline.create(description)
}

export {
    renderPipeline,
    RenderPipeline
}