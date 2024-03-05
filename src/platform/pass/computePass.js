import { UUID } from "../../core/utils/uuid";
import { Binding } from "../binding/binding";
import { ComputePipeline } from "../pipeline/computePipeline";

/**
 * @typedef {Object} ComputePassDescription
 * @property {string} name
 */

export class ComputePass {

    /**
     * @param {ComputePassDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()
        
        this.name = description.name

        /**
         * @type {Array<{pipeline: ComputePipeline, binding: Binding}>}
         */
        this.computecalls = []

        this.pass = undefined

        this.update()
    }

    /**
     * @param {ComputePassDescription} description 
     */
    static create(description) {
        
        return new ComputePass(description)
    }

    update() {

        this.passDescription = {
            label: `Compute pass (${this.name})`
        }
    }

    /**
     * 
     * @param {ComputePipeline} pipeline 
     * @param {Binding} binding 
     */
    add(pipeline, binding) {

        this.computecalls.push({ pipeline, binding })
        return this
    }

    empty() {
        this.computecalls = []
    }

    /**
     * 
     * @param {GPUCommandEncoder} encoder 
     */
    execute(encoder) {

        this.pass = encoder.beginComputePass(this.passDescription)
        this.computecalls.forEach(({ binding, pipeline }) => {

            if (!binding.tryMakeComplete() || !pipeline.tryMakeComplete(this, binding)) return
            
            pipeline.dispatch(this, binding)
        })
        
        this.pass.end()
    }
}