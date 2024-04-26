import { Shader } from "../shader/shader.js"
import director from '../director/director.js'
import { Binding } from "../binding/binding.js"
import { ComputePass } from "../pass/computePass.js"
import { ScratchObject } from '../../core/object/object.js'

/**
 * @typedef {Object} ComputePipelineDescription
 * @property {string} [name]
 * @property {{module: Shader, csEntryPoint?: string}} shader
 * @property {{[constantName: string]: number}} constants
 */

class ComputePipeline extends ScratchObject {

    /**
     * @param {ComputePipelineDescription} description 
     */
    constructor(description) {

        super()

        this.shader = description.shader.module.use()
        this.name = description.name || 'Compute Pipeline'
        this.csEntryPoint = description.shader.csEntryPoint || 'cMain'

        this.constants = description.constants

        this.layoutDescriptor = undefined
        this.descriptor = undefined
        
        /**
         * @type {GPUPipelineLayout}
         */
        this.pipelineLayout = undefined
        this.pipeline = undefined

        this.isFinite = false
        this.triggerCount = 0

        this.bindingCase = undefined
        this.executable = false

        director.addToUpdateList(this)
    }

    /**
     * @param {ComputePipelineDescription} description 
     */
    static create(description) {
        return new ComputePipeline(description)
    }

    exportLayoutDescriptor() {

        if (this.layoutDescriptor) return this.layoutDescriptor

        this.layoutDescriptor = {
            label: `Compute Pipline Layout (${this.name})`,
            bindGroupLayouts: this.bindingCase.getBindGroupLayouts(),
        }

        this.bindingCase = this.bindingCase.release()

        return this.layoutDescriptor
    }

    exportDescriptor() {

        if (this.descriptor.layout) return this.layoutDescriptor

        this.descriptor.layout = this.pipelineLayout
        this.descriptor.compute.module = this.shader.shaderModule

        return this.descriptor
    }

    /**
     * @param {ComputePass} pass 
     * @param {Binding} binding 
     */
    setDependency(pass, binding) {

        this.bindingCase = binding.use()

        // Set descriptor
        this.descriptor = {
            label: `Compute Pipeline (${this.name})`,
            layout: undefined,
            compute: {
                module: undefined,
                entryPoint: this.csEntryPoint,
                constants: this.constants
            }
        }
    }

    createPipeline() {

        director.dispatchEvent({type: 'createPipelineLayout', emitter: this})
        director.dispatchEvent({type: 'createComputePipelineAsync', emitter: this})
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
     * @param {number} counts 
     */
    triggerFiniteTimes(counts) {

        this.isFinite = true
        this.triggerCount = counts

        return this
    }

    /**
     * @param {ComputePass} computePass 
     * @param {Binding} binding 
     */
    dispatch(computePass, binding) {

        if (this.isFinite && (!this.triggerCount)) return
        else this.triggerCount = Math.max(this.triggerCount - 1, 0)

        if (!this.executable) return

        binding.setBindGroups(computePass.pass)
        computePass.pass.setPipeline(this.pipeline)
        if (binding.isIndirect) computePass.pass.dispatchWorkgroupsIndirect(binding.indirectBinding.buffer.buffer, binding.indirectBinding.byteOffset)
        else computePass.pass.dispatchWorkgroups(...binding.range())
    }

    destroy() {

        this.name = null
        this.shader = this.shader.release()
        this.csEntryPoint = null

        this.constants = []

        this.layoutDescriptor = null
        this.descriptor = null

        this.pipelineLayout = null
        this.pipeline = null

        this.isFinite = null
        this.triggerCount = null

        this.bindingCase = null
        this.executable = false

        super.destroy()

        return null
    }
}

/**
 * @param {ComputePipelineDescription} description 
 */
function computePipeline(description) {

    return new ComputePipeline(description)
}

export {
    computePipeline,
    ComputePipeline
}