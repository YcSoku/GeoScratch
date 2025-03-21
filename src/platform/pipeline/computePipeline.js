import { UUID } from "../../core/util/util"
import { Binding } from "../binding/binding"
import { device } from "../context/singletonDevice"
import { ComputePass } from "../pass/computePass"
import { Shader } from "../shader/shader"

/**
 * @typedef {Object} ComputePipelineDescription
 * @property {string} [name]
 * @property {{module: Shader, csEntryPoint?: string}} shader
 * @property {{[constantName: string]: number}} constants
 */

class ComputePipeline {

    /**
     * @param {ComputePipelineDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()

        this.name = description.name ? description.name : 'Computable builder'
        this.shader = description.shader.module.use()
        this.csEntryPoint = description.shader.csEntryPoint || 'cMain'

        this.constants = description.constants

        /**
         * @type {GPUPipelineLayout}
         */
        this.pipelineLayout = undefined
        this.pipeline = undefined

        this.pipelineCreating = false

        this.isFinite = false
        this.triggerCount = 0

        this.executable = true
    }

    /**
     * @param {ComputePipelineDescription} description 
     */
    static create(description) {
        return new ComputePipeline(description)
    }

    /**
     * 
     * @param {Binding} binding 
     */
    createPipelineLayout(binding) {

        this.pipelineLayout = device.createPipelineLayout({
            label: `compute pipline layout (${this.name})`,
            bindGroupLayouts: binding.getBindGroupLayouts(),
        })
    }

    /**
     * 
     * @param {Binding} binding 
     */
    createPipeline(binding) {

        this.pipelineCreating = true

        this.createPipelineLayout(binding)

        device.createComputePipelineAsync({
            label: `compute pipeline (${this.name})`,
            layout: this.pipelineLayout,
            compute: {
                module: this.shader.shaderModule,
                entryPoint: this.csEntryPoint,
                constants: this.constants
            }
        })
            .then(pipeline => {
                this.pipeline = pipeline
                this.pipelineCreating = false
            })
            .catch(error => {
                console.error(`Error::Compute Pipeline (${this.name}) Creation FAILED!`, error);
            });
    }

    /**
     * @param {ComputePass} computePass 
     * @param {Binding} binding 
     */
    isComplete(computePass, binding) {

        if (this.pipeline) return true

        !this.pipelineCreating && this.createPipeline(renderPass, binding)
        return false
    }

    /**
     * @param {ComputePass} computePass 
     * @param {Binding} binding 
     */
    tryMakeComplete(computePass, binding) {

        if (this.pipeline) return true

        if (!this.shader.isComplete()) return false

        !this.pipelineCreating && this.createPipeline(binding)
        return false
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
}

/**
 * @param {ComputePipelineDescription} description 
 */
function computePipeline(description) {

    return ComputePipeline.create(description)
}

export {
    computePipeline,
    ComputePipeline
}