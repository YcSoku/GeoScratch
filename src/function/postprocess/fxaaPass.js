import { aRef } from "../../platform/data/arrayRef.js"
import { Binding } from "../../platform/binding/binding.js"
import { Texture } from "../../platform/texture/texture.js"
import { ComputePass } from "../../platform/pass/computePass.js"
import shaderLoader from "../../resource/shader/shaderLoader.js"
import { StorageBuffer } from "../../platform/buffer/storageBuffer.js"
import { ComputePipeline } from "../../platform/pipeline/computePipeline.js"

/**
 * @typedef {Object} FXAAPassDescription
 * @property {number} threshold
 * @property {number} searchStep
 * @property {Texture} inputColorAttachment
 */

export class FXAAPass {

    /**
     * @param {FXAAPassDescription} description 
     */
    constructor(description) {

        this.threshold = description.threshold
        this.searchStep = description.searchStep
        this.inputColorAttachment = description.inputColorAttachment

        this.fxaaTexture = Texture.create({
            name: 'Texture (FXAA)',
            format: 'rgba16float', 
            computable: true,
            resource: {size: () => [description.inputColorAttachment.texture.width, description.inputColorAttachment.texture.height]}
        })

        this.blockSizeX = 16
        this.blockSizeY = 16
        // FXAA binding
        this.fxaaBinding = Binding.create({
            name: 'FXAA',
            range: () => [Math.ceil(this.fxaaTexture.texture.width / this.blockSizeX), Math.ceil(this.fxaaTexture.texture.height / this.blockSizeY)],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        threshold: {
                            type: 'f32',
                            value: () => this.threshold,
                        },
                        searchStep: {
                            type: 'i32',
                            value: () => this.searchStep,
                        },
                    }
                }
            ],
            textures: [
                { texture: this.inputColorAttachment },
                { texture: this.fxaaTexture, asStorage: true },
            ]
        })

        /**
         * @type {ComputePipeline}
         */
        this.fxaaPipeline = ComputePipeline.create({
            name: 'Compute Pipeline (FXAA)',
            shader: shaderLoader.load('Shader (FXAA)', '/shaders/fxaa.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePass}
         */
        this.computePass = ComputePass.create({
            name: 'Compute Pass (FXAA)',
        }).add(this.fxaaPipeline, this.fxaaBinding)
    }

    /**
     * 
     * @param {FXAAPass} description 
     */
    static create(description) {
        
        return new FXAAPass(description)
    }

    /**
     * @param {GPUCommandEncoder} encoder 
     */
    execute(encoder) {

        this.computePass.execute(encoder)
    }

    getOutputAttachment() {

        return this.fxaaTexture
    }

    onWindowResize() {

        const width = this.inputColorAttachment.texture.width
        const height = this.inputColorAttachment.texture.height

        this.fxaaTexture.reset({
            resource: {
                size: () => [width, height]
            }
        })
    }
}