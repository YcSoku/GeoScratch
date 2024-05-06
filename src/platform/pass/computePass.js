import director from "../director/director.js"
import { Binding } from "../binding/binding.js"
import { ScratchObject } from '../../core/object/object'
import { ComputePipeline } from "../pipeline/computePipeline.js"

/**
 * @typedef {Object} ComputePassDescription
 * @property {string} name
 */

export class ComputePass extends ScratchObject {

    /**
     * @param {ComputePassDescription} description 
     */
    constructor(description) {

        super()
        
        this.name = description.name

        /**
         * @type {Array<{pipeline: ComputePipeline, binding: Binding}>}
         */
        this.computecalls = []

        this.pass = undefined
        
        this.executable = false

        director.addToUpdateList(this)
    }

    /**
     * @param {ComputePassDescription} description 
     */
    static create(description) {
        
        return new ComputePass(description)
    }

    update() {

        this.passDescription = {
            label: `Compute Pass (${this.name})`
        }

        this.executable = true
    }

    /**
     * @param {ComputePipeline} pipeline 
     * @param {Binding} binding 
     */
    add(pipeline, binding) {

        // Dependency injection
        pipeline.setDependency(this, binding)

        this.computecalls.push({ pipeline: pipeline.use(), binding: binding.use() })
        return this
    }

    empty() {

        this.computecalls.forEach(computecall => {
            computecall.binding = computecall.binding.release()
            computecall.pipeline = computecall.pipeline.release()
        })
        this.computecalls = []
    }

    /**
     * 
     * @param {GPUCommandEncoder} encoder 
     */
    execute(encoder) {

        this.pass = encoder.beginComputePass(this.passDescription)

        this.computecalls
        .filter(({ binding, pipeline }) => binding.executable && pipeline.executable)
        .forEach(({ binding, pipeline }) => pipeline.dispatch(this, binding))
        
        this.pass.end()
    }

    destroy() {

        this.name = null

        this.computecalls.forEach(computecall => {
            computecall.binding = computecall.binding.release()
            computecall.pipeline = computecall.pipeline.release()
        })
        this.computecalls = null

        this.pass = null
    
        this.executable = false

        super.destroy()

        return null
    }
}

/**
 * @param {ComputePassDescription} description 
 */
export function computePass(description) {

    return new ComputePass(description)
}