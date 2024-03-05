import { aRef } from "../../platform/data/arrayRef.js"
import { Binding } from "../../platform/binding/binding.js"
import { Texture } from "../../platform/texture/texture.js"
import { ComputePass } from "../../platform/pass/computePass.js"
import shaderLoader from "../../resource/shader/shaderLoader.js"
import { StorageBuffer } from "../../platform/buffer/storageBuffer.js"
import { ComputePipeline } from "../../platform/pipeline/computePipeline.js"

function gaussian(x, sigma = 1.0) {

    let a = 1.0 / (sigma * Math.sqrt(2.0 * Math.PI));
    return a * Math.exp(-((x * x) / (2.0 * sigma * sigma)));
}

/**
 * @typedef {Object} BloomPassDescription
 * @property {number} threshold
 * @property {number} strength
 * @property {number} blurCount
 * @property {Texture} inputColorAttachment
 */

export class BloomPass {

    /**
     * @param {BloomPassDescription} description 
     */
    constructor(description) {

        this.strength = description.strength
        this.threshold = description.threshold
        this.blurCount = description.blurCount
        this.inputColorAttachment = description.inputColorAttachment

        this.gaussianKernel = aRef(new Float32Array(4 + (this.blurCount - 1) * 2), 'gaussian kernel')
        this.gaussianSigma = (3 + (this.blurCount - 1) * 2) / 2.0
        for (let i = 0; i < 4 + (this.blurCount - 1) * 2; i++) {
            this.gaussianKernel.elements(i, gaussian(i, this.gaussianSigma))
        }

        this.highlightTexture = Texture.create({
            name: 'Texture (Bloom highlight)',
            format: 'rgba16float', 
            computable: true,
            resource: {size: () => [description.inputColorAttachment.texture.width, description.inputColorAttachment.texture.height]}
        })

        this.outputTexture = Texture.create({
            name: 'Texture (Bloom output)',
            format: 'rgba16float', 
            computable: true,
            resource: {size: () => [description.inputColorAttachment.texture.width, description.inputColorAttachment.texture.height]}
        })

        /**
         * @type {Array<Texture>}
         */
        this.dHighlightTextures = new Array(this.blurCount)

        /**
         * @type {Array<Texture>}
         */
        this.blurXTextures = new Array(this.blurCount)
        /**
         * @type {Array<Texture>}
         */
        this.blurYTextures = new Array(this.blurCount)

        for (let i = 0; i < this.blurCount; i++) {
            let scaleFactor = Math.pow(2, i + 1)
            let width = Math.floor(description.inputColorAttachment.texture.width / scaleFactor)
            let height = Math.floor(description.inputColorAttachment.texture.height / scaleFactor)

            this.dHighlightTextures[i] = Texture.create({
                name: `Texture (Highlight ${i})`,
                format: 'rgba16float',
                computable: true,
                resource: {size: () => [width, height]}
            })

            scaleFactor = Math.pow(2, i)
            width = Math.floor(description.inputColorAttachment.texture.width / scaleFactor)
            height = Math.floor(description.inputColorAttachment.texture.height / scaleFactor)

            this.blurXTextures[i] = Texture.create({
                name: `Texture (blurX ${i})`,
                format: 'rgba16float', 
                computable: true,
                resource: { size: () => [width, height] }
            });

            this.blurYTextures[i] = Texture.create({
                name: `Texture (blurY ${i})`,
                format: 'rgba16float', 
                computable: true,
                resource: { size: () => [width, height] }
            });
        }

        /**
         * @type {StorageBuffer}
         */
        this.storageBuffer_gaussian = StorageBuffer.create({
            name: 'Storage buffer (gaussian kernel)',
            resource: {arrayRef: this.gaussianKernel}
        })

        /**
         * @type {Array<Texture>}
         */
        this.downSamplerPassInputColor = new Array(this.blurCount)

        for (let i = 1; i < this.blurCount; i++) {
            this.downSamplerPassInputColor[i] = this.dHighlightTextures[i - 1]
        }
        this.downSamplerPassInputColor[0] = this.highlightTexture

        this.blurUpPassHighlightInputColor = new Array(this.blurCount)
        /**
         * @type {Array<Texture>}
         */
        /**
         * @type {Array<Texture>}
         */
        this.blurUpXPassInputColor = new Array(this.blurCount)
        /**
         * @type {Array<Texture>}
         */
        this.blurUpYPassInputColor = new Array(this.blurCount)

        for (let i = 0; i < this.blurCount - 1; i++) {
            this.blurUpXPassInputColor[i] = this.blurYTextures[i + 1]
            this.blurUpYPassInputColor[i] = this.blurXTextures[i]
        }
        this.blurUpXPassInputColor[this.blurCount - 1] = this.dHighlightTextures[this.blurCount - 1]
        this.blurUpYPassInputColor[this.blurCount - 1] = this.blurXTextures[this.blurCount - 1]
        
        for (let i = 1; i < this.blurCount; i++) {
            this.blurUpPassHighlightInputColor[i] = this.dHighlightTextures[i - 1]
        }
        this.blurUpPassHighlightInputColor[0] = this.highlightTexture

        this.blockSizeX = 16
        this.blockSizeY = 16
        // Highlight extraction binding
        this.highlightBinding = Binding.create({
            name: 'highlight binding',
            range: () => [Math.ceil(this.highlightTexture.texture.width / this.blockSizeX), Math.ceil(this.highlightTexture.texture.height / this.blockSizeY)],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        threshold: () => this.threshold,
                    }
                }
            ],
            textures: [
                { texture: this.inputColorAttachment },
                { texture: this.highlightTexture, asStorage: true },
            ]
        })

        this.downSampleBindings = new Array(this.blurCount)
        for (let i = 0; i < this.blurCount; i++) {
            let groupX = Math.ceil(this.dHighlightTextures[i].texture.width / this.blockSizeX)
            let groupY = Math.ceil(this.dHighlightTextures[i].texture.height / this.blockSizeY)
            this.downSampleBindings[i] = Binding.create({
                name: `Binding (Highlight ${i})`,
                range: () => [groupX, groupY],
                textures: [
                    { texture: this.downSamplerPassInputColor[i] },
                    { texture: this.dHighlightTextures[i], asStorage: true },
                ]
            })
        }

        // Gaussian fusion binding in direction x and y 
        /**
         * @type {Array<Binding>}
         */
        this.blurUpXBindings = new Array(this.blurCount)
        /**
         * @type {Array<Binding>}
         */
        this.blurUpYBindings = new Array(this.blurCount)
        for (let i = 0; i < this.blurCount; i++) {
            let groupX = Math.ceil(this.blurXTextures[i].texture.width / this.blockSizeX)
            let groupY = Math.ceil(this.blurXTextures[i].texture.height / this.blockSizeY)

            this.blurUpXBindings[i] = Binding.create({
                range: () => [groupX, groupY],
                uniforms: [
                    {
                        name: 'staticUniform',
                        map: {
                            steps: () => 3 + i * 2,
                            direction: () => [0.0, 1.0],
                        }
                    }
                ],
                textures: [
                    { texture: this.blurUpPassHighlightInputColor[i] },
                    { texture: this.blurUpXPassInputColor[i] },
                    { texture: this.blurXTextures[i], asStorage: true },
                ],
                storages: [ { buffer: this.storageBuffer_gaussian } ],
            })

            this.blurUpYBindings[i] = Binding.create({
                range: () => [groupX, groupY],
                uniforms: [
                    {
                        name: 'staticUniform',
                        map: {
                            steps: () => 3 + i * 2,
                            direction: () => [1.0, 0.0],
                        }
                    }
                ],
                textures: [
                    { texture: this.blurUpPassHighlightInputColor[i] },
                    { texture: this.blurUpYPassInputColor[i] },
                    { texture: this.blurYTextures[i], asStorage: true },
                ],
                storages: [ { buffer: this.storageBuffer_gaussian } ],
            })
        }

        // Output binding 
        let groupX = Math.ceil(this.outputTexture.texture.width / this.blockSizeX)
        let groupY = Math.ceil(this.outputTexture.texture.height / this.blockSizeY)
        this.outputBinding = Binding.create({
            range: () => [groupX, groupY],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        strength: () => this.strength
                    }
                }
            ],
            textures: [ 
                { texture: this.inputColorAttachment },,
                { texture: this.blurYTextures[0] },
                { texture: this.outputTexture, asStorage: true },
            ],
        })

        /**
         * @type {ComputePipeline}
         */
        this.highlight = ComputePipeline.create({
            name: 'Computable builder (Highlight extraction)',
            shader: shaderLoader.load('Shader (Hightlight)', '/shaders/highlight.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePipeline}
         */
        this.downSample = ComputePipeline.create({
            name: 'Computable builder (Highlight downsample)',
            shader: shaderLoader.load('Shader (Down Sampling)', '/shaders/downsample.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePipeline}
         */
        this.blurUpX = ComputePipeline.create({
            name: 'Computable builder (Blur up X)',
            shader: shaderLoader.load('Shader (Blur Up X)', '/shaders/gaussianBlurX.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePipeline}
         */
        this.blurUpY = ComputePipeline.create({
            name: 'Computable builder (Blur up Y)',
            shader: shaderLoader.load('Shader (Blur Up Y)', '/shaders/gaussianBlurY.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePipeline}
         */
        this.output = ComputePipeline.create({
            name: 'Computable builder (Output)',
            shader: shaderLoader.load('Shader (Texture Add)', '/shaders/bloomOutput.compute.wgsl'),
            constants: { blockSize: 16 },
        })

        /**
         * @type {ComputePass}
         */
        this.computePass = ComputePass.create({
            name: 'Compute Pass (Highlight)',
        }).add(this.highlight, this.highlightBinding)
        for (let i = 0; i < this.blurCount; i++) {
            this.computePass.add(this.downSample, this.downSampleBindings[i])
        }
        for (let i = this.blurCount - 1; i >= 0; i--) {
            this.computePass.add(this.blurUpX, this.blurUpXBindings[i])
            this.computePass.add(this.blurUpY, this.blurUpYBindings[i])
        }
        this.computePass.add(this.output, this.outputBinding)
    }

    /**
     * 
     * @param {BloomPassDescription} description 
     */
    static create(description) {
        
        return new BloomPass(description)
    }

    /**
     * @param {GPUCommandEncoder} encoder 
     */
    execute(encoder) {

        this.computePass.execute(encoder)
    }

    getOutputAttachment() {

        return this.outputTexture
    }

    onWindowResize() {

        const width = this.inputColorAttachment.texture.width
        const height = this.inputColorAttachment.texture.height

        this.outputTexture.reset({
            resource: {
                size: () => [width, height]
            }
        })

        for (let i = 0; i < this.blurCount; i++) {

            let w = width
            let h = height

            if (i) {
                w /= 2.0 * i;
                h /= 2.0 * i;
            }
        }
    }
}