import { UUID } from "../../core/utils/uuid.js";
import getDevice from "../context/device.js";
import { makeShaderDataDefinitions } from "../../core/utils/webgpu-utils.module.js";
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
        this.code = description.codeFunc
        this.shaderModule = undefined
        this.dirty = true
    }

    /**
     * 
     * @param {ShaderDescription} description 
     */
    static create(description) {

        return new Shader(description)
    }

    update() {
        if (!this.dirty) return
        
        const device = getDevice()

        const code = this.code()
        if (code) {
            this.shaderModule = device.createShaderModule({
                label: this.name,
                code: code
            })
            this.defs = makeShaderDataDefinitions(code)

            this.dirty = false
        }
    }

    isComplete() {

        if (this.shaderModule) return true

        this.update()
        return false
    }
}

export {
    Shader
}
