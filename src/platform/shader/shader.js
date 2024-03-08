import { UUID } from "../../core/utils/uuid.js";
import getDevice from "../context/device.js";
import { makeShaderDataDefinitions } from "../../core/utils/webgpu-utils.module.js";
import director from "../director/director.js";
/**
 * @typedef {Object} ShaderDescription
 * @property {string} name
 * @property {Function} [codeFunc]
 */

class Shader {

    /**
     * 
     * @param {ShaderDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()

        this.name = description.name
        this.shaderModule = undefined
        this.code = description.codeFunc
        this.code() && director.dispatchEvent({type: 'createShader', emitter: this})
        // this.dirty = true
    }

    /**
     * @param {ShaderDescription} description 
     */
    static create(description) {

        return new Shader(description)
    }

    exportDescriptor() {

        return {

            label: this.name,
            code: this.code()
        }
    }

    /**
     * @deprecated
     * @param {GPUDevice} device 
     */
    update(device) {
        // if (!this.dirty) return
        
        // const device = getDevice()

        const code = this.code()
        if (code) {
            this.shaderModule = device.createShaderModule({
                label: this.name,
                code: code
            })
            this.defs = makeShaderDataDefinitions(code)

            // this.dirty = false
        }
    }

    isComplete() {

        if (this.shaderModule) return true
        return false
    }
}

/**
 * @param {ShaderDescription} description 
 */
function shader(description) {

    return Shader.create(description)
}

export {
    shader,
    Shader
}
