import { UUID } from '../../core/utils/uuid.js';
import { Binding } from '../binding/binding.js';
import { NoBlending } from '../blending/blending.js';
import getDevice from '../context/device.js'
import { RenderPass } from '../pass/renderPass.js';
import { Shader } from '../shader/shader.js';

/**
 * @typedef {Object} RenderPipelineDescription
 * @property {string} name
 * @property {{module: Shader, vsEntryPoint?: string, fsEntryPoint?: string}} shader
 * @property {Array<{format?: GPUTextureFormat, blend?: GPUBlendState, writeMask?: GPUColorWriteFlags}>} [colorTargetStates]
 * @property {GPUPrimitiveState} [primitive]
 * @property {boolean} [depthTest]
 * @property {boolean} [asBundle]
 */

class RenderPipeline {

    /**
     * @param {RenderPipelineDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()
        this.shader = description.shader.module
        this.name = description.name || 'Drawable builder'
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

        this.depthTest = true
        this.depthTest = description.depthTest !== undefined ? this.depthTest : description.depthTest

        this.pipelineLayout = undefined
        this.pipeline = undefined

        this.asBundle = description.asBundle !== undefined ? description.asBundle : false
        this.bundleDirty = this.asBundle
        this.renderBundle = undefined

        this.pipelineCreating = false

        this.isFinite = false
        this.triggerCount = 0
    }

    /**
     * @param {RenderPipelineDescription} description 
     */
    static create(description) {
        return new RenderPipeline(description)
    }

    /**
     * @param {Binding} binding 
     */
    createPipelineLayout(binding) {

        const device = getDevice()
        this.pipelineLayout = device.createPipelineLayout({
            label: `rendering pipline layout (${this.name})`,
            bindGroupLayouts: binding.getBindGroupLayouts(),
        })
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
                blend: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].blend : NoBlending,
                writeMask: this.colorTargetStateDescriptions !== undefined ? this.colorTargetStateDescriptions[index].writeMask: undefined,
            }
        })

        const depthStencilFormat = pass.makeDepthStencilFormat()
        depthStencilFormat && (this.depthStencilState = {

            depthWriteEnabled: this.depthTest,
            depthCompare: 'less',
            format: depthStencilFormat
        })
    }

    /**
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    createPipeline(renderPass, binding) {

        const device = getDevice()

        this.pipelineCreating = true

        this.createPipelineLayout(binding)
        this.createTargetState(renderPass)

        /**
         * @type {GPUPrimitiveState}
         */
        const primitiveState = {
            topology: this.primitive.topology,
            frontFace: this.primitive.frontFace,
            cullMode: this.primitive.cullMode,
            unclippedDepth: this.primitive.unclippedDepth,
            ...(binding.indexBinding && (this.primitive.topology === 'line-strip' || this.primitive.topology === 'triangle-strip') && {
                stripIndexFormat: binding.indexBinding.buffer.type
            })
        }

        device.createRenderPipelineAsync({
            label: `rendering pipeline (${this.name})`,
            layout: this.pipelineLayout,
            vertex: {
                module: this.shader.shaderModule,
                entryPoint: this.vsEntryPoint,
                buffers: binding.getVertexLayouts(),
            },
            fragment: {
                module: this.shader.shaderModule,
                entryPoint: this.fsEntryPoint,
                targets: this.colorTargetStates,
            },
            primitive: primitiveState,
            depthStencil: this.depthStencilState,
        })
        .then(pipeline => {
            this.pipeline = pipeline
            this.pipelineCreating = false
        })
        .catch(error => {
            console.error(`Error::Rendering Pipeline (${this.name}) Creation FAILED!`, error);
        });
    }

    /**
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    tryMakeComplete(renderPass, binding) {

        if (this.pipeline) return true

        if (!this.shader.isComplete()) return false

        !this.pipelineCreating && this.createPipeline(renderPass, binding)
        return false
    }

    /**
     * 
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    makeRenderBundle(renderPass, binding) {

        const device = getDevice()
        const renderBundleEncoder = device.createRenderBundleEncoder({
            colorFormats: renderPass.makeColorFormats(),
            depthStencilFormat: renderPass.makeDepthStencilFormat(),
        })
        this.executeRenderPass(renderBundleEncoder, binding)
        this.renderBundle = renderBundleEncoder.finish()
        this.bundleDirty = false
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
     * 
     * @param {RenderPass} renderPass 
     * @param {Binding} binding 
     */
    draw(renderPass, binding) {

        if (this.isFinite && (!this.triggerCount)) return
        else this.triggerCount = Math.max(this.triggerCount - 1, 0)
        
        if (this.asBundle) {
            if (this.bundleDirty) this.makeRenderBundle(renderPass, binding)
            renderPass.pass.executeBundles([this.renderBundle])
        } 
        else this.executeRenderPass(renderPass.pass, binding)
    }
}

export {
    RenderPipeline
}