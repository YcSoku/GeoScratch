import { makeStructuredView } from './webgpu-utils.module.js';
import { UniformBuffer } from '../buffer/uniformBuffer.js';
import { StorageBuffer } from '../buffer/storageBuffer.js';
import { Texture } from '../texture/texture.js';
import { ArrayRef } from '../data/arrayRef.js';
import { VertexBuffer } from '../buffer/vertexBuffer.js';
import { IndirectBuffer } from '../buffer/indirectBuffer.js';
import { Shader } from '../shader/shader.js';
import { IndexBuffer } from '../buffer/indexBuffer.js';
import getDevice from '../context/device.js'
import { UUID } from '../../core/utils/uuid.js';
import { BlockRef } from '../data/blockRef.js';
import director from '../director/director.js';

/**
 * @typedef {Object} VertexBindingDescription
 * @property {VertexBuffer} buffer
 * @property {number} [visibility]
 * @property {boolean} [isInstanced]
 */

/**
 * @typedef {Object} IndexBindingDescription
 * @property {IndexBuffer} buffer
 */

/**
 * @typedef {Object} IndexBinding
 * @property {IndexBuffer} [buffer]
 */

/**
 * @typedef {Object} IndirectBindingDescription
 * @property {IndirectBuffer} [buffer]
 * @property {number} [byteOffset]
 */

/**
 * @typedef {Object} IndirectBinding
 * @property {IndirectBuffer} [buffer]
 * @property {number} byteOffset
 */

/**
 * @typedef {Object} VertexBinding
 * @property {VertexBuffer} buffer
 * @property {number} visibility
 * @property {GPUVertexStepMode} stepMode
 */

/**
 * @typedef {Object} UniformBindingDescription
 * @property {string} name
 * @property {boolean} [dynamic]
 * @property {number} [visibility]
 * @property {{[varName: string]: {type: import('../data/blockRef.js').BlockValueType, value: Function}}} map
 */

/**
 * @typedef {Object} UniformBinding
 * @property {string} name
 * @property {number} [visibility]
 * @property {{[dataName: string]: Function}} map
 * @property {import('./webgpu-utils.module.js').StructuredView} view
 * @property {BlockRef} ref
 */

/**
 * @typedef {Object} SharedUniformBindingDescription
 * @property {UniformBuffer} buffer
 * @property {number} [visibility]
 */

/**
 * @typedef {Object} SamplerDescription
 * @property {string} name
 * @property {Array<GPUAddressMode>} addressModeUVW
 * @property {Array<GPUFilterMode>} filterMinMag
 * @property {number} [visibility]
 * @property {number} [mipmap]
 * @property {GPUSamplerBindingType} [bindingType]
 * @property {number} [maxAnisotropy]
 */

/**
 * @typedef {Object} StorageBindingDescription
 * @property {StorageBuffer} buffer
 * @property {boolean} [writable]
 */

/**
 * @typedef {Object} StorageBinding
 * @property {StorageBuffer} buffer
 * @property {number} visibility
 * @property {GPUBufferBindingType} type
 */

/**
 * @typedef {Object} TextureBindingDescription
 * @property {Texture} texture
 * @property {GPUTextureSampleType} [sampleType]
 * @property {GPUTextureViewDimension} [viewDimension]
 * @property {number} [visibility]
 * @property {boolean} [multisampled]
 * @property {boolean} [asStorage]
 * @property {GPUStorageTextureAccess} [accessibility]
 */

/**
 * @typedef {Object} TextureBinding
 * @property {Texture} [texture]
 * @property {GPUTextureSampleType} sampleType
 * @property {GPUTextureViewDimension} viewDimension
 * @property {number} visibility
 * @property {boolean} multisampled
 * @property {boolean} asStorage
 * @property {GPUStorageTextureAccess} [accessibility]
 * @property {number} callbackIndex
 */

/**
 * @typedef {Object} SamplerBinding
 * @property {GPUSampler} sampler
 * @property {number} visibility
 * @property {GPUSamplerBindingType} bindingType
 */

/**
 * @typedef {Object} BindingsDescription
 * @property {string} [name]
 * @property {Function} [range]
 * @property {IndexBindingDescription} [index]
 * @property {Array<SamplerDescription>} [samplers]
 * @property {Array<UniformBindingDescription>} [uniforms]
 * @property {Array<SharedUniformBindingDescription>} [sharedUniforms]
 * @property {IndirectBindingDescription} [indirect]
 * @property {Array<VertexBindingDescription>} [vertices]
 * @property {Array<StorageBindingDescription>} [storages]
 * @property {Array<TextureBindingDescription>} [textures]
 */

class Binding {

    /**
     * @param {BindingsDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()

        /**
         * @type {[UniformBinding]}
         */
        this.uniforms = []

        /**
         * @type {[SharedUniformBindingDescription]}
         */
        this.sharedUniforms = []

        /**
         * @type {IndexBinding}
         */
        this.indexBinding = description.index
        this.indexBinding && this.indexBinding.buffer.use()

        /**
         * @type {IndirectBinding}
         */
        this.indirectBinding = description.indirect ? {
            buffer: description.indirect.buffer.use(),
            byteOffset: description.indirect.byteOffset ? description.indirect.byteOffset : 0
        } : undefined

        /**
         * @type {[VertexBinding]}
         */
        this.vertexBindings = []

        /**
         * @type {[StorageBinding]}
         */
        this.storageBindings = []

        /**
         * @type {[TextureBinding]}
         */
        this.textureBindings = []

        /**
         * @type {[SamplerBinding]}
         */
        this.samplerBindings = []
        
        /**
         * @type {[GPUBindGroupLayout]}
         */
        this.layouts = []

        /**
         * @type {[GPUVertexBufferLayout]}
         */
        this.vertexLayouts = new Array(description.vertices ? description.vertices.length : 0)

        /**
         * @type {[GPUBindGroup]}
         */
        this.groups = []

        this.name = description.name ? description.name : 'Binding'

        description.vertices && description.vertices.forEach((bindingDesc) => {
            this.addVertexBuffer(bindingDesc)
        })

        let groupOrder = 0
        this.uniformOrder = 0;
        if (description.uniforms || description.sharedUniforms) {

            this.uniformOrder = groupOrder++
            description.uniforms?.forEach(uniformDesc => this.addUniformBlock(uniformDesc)) 
            description.sharedUniforms?.forEach(description => this.sharedUniforms.push({
                buffer: description.buffer.use(),
                visibility: description.visibility || (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)
            })) 
        }

        this.storageOrder = 0;
        description.storages && (this.storageOrder = groupOrder++)
        description.storages && description.storages.forEach((bindingDesc) => {
            this.addStorageBuffer(bindingDesc)
        }) 

        this.textureOrder = 0;
        description.textures && (this.textureOrder = groupOrder++)
        description.textures && description.textures.forEach((bindingDesc) => {
            this.addTexture(bindingDesc)
        }) 

        description.samplers && description.samplers.forEach((samplerDesc, index) => {
            this.addSampler(index, samplerDesc)
        });

        this.isIndirect = description.range !== undefined ? false : true
        if (!this.isIndirect) this.range = description.range

        this.isComplete = false

        this.uniformBufferReady = false

        this.released = false

        this.refCount = 0

        director.addBinding(this)
    }

    /**
     * @param {BindingsDescription} description 
     * @returns 
     */
    static create(description) {

        return new Binding(description)
    }

    /**
     * @param {UniformBindingDescription} blockDesc 
     */
    addUniformBlock(blockDesc) {

        this.uniforms.push({
            ref: new BlockRef({
                map: blockDesc.map,
                name: blockDesc.name,
                dynamic: blockDesc.dynamic !== undefined ? blockDesc.dynamic : false,
            }),
            visibility: blockDesc.visibility || (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE)
        })

        const blocks = []
        this.uniforms.forEach(uniform => blocks.push(uniform.ref))

        /**
         * Create the uniform buffer
         * @type {UniformBuffer}
         * Notation: a binding has only one uniform buffer
         */
                this.uniformBuffer = UniformBuffer.create({
                    name: `Uniform buffer (${this.name})`,
                    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
                    blocks: blocks
                }).use()
        
                this.updateUniformBlock()
        
                this.uniformBufferReady = true
    }

    /**
     * @param {VertexBindingDescription} bindingDesc 
     */
    addVertexBuffer(bindingDesc) {

        let isInstanced = false
        isInstanced = bindingDesc.isInstanced === undefined ? isInstanced : bindingDesc.isInstanced

        this.vertexBindings.push({
            buffer: bindingDesc.buffer.use(),
            stepMode: isInstanced ? 'instance' : 'vertex',
            visibility: bindingDesc.visibility || GPUShaderStage.VERTEX
        })
    }

    /**
     * @param {StorageBindingDescription} bindingDesc 
     */
    addStorageBuffer(bindingDesc) {

        const writable = bindingDesc.writable !== undefined ? bindingDesc.writable : false

        this.storageBindings.push({
            buffer: bindingDesc.buffer.use(),
            type: writable ? 'storage' : 'read-only-storage',
            visibility: writable ? GPUShaderStage.COMPUTE : (GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE),
        })
    }

    /**
     * @param {TextureBindingDescription} bindingDesc 
     */
    addTexture(bindingDesc) {

        let accessibility = 'read-only'
        let asStorage = bindingDesc.asStorage !== undefined ? bindingDesc.asStorage : false
        let visibility = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
        if (asStorage) {
            visibility = GPUShaderStage.FRAGMENT | GPUShaderStage.COMPUTE
            if (bindingDesc.texture.computable) accessibility = 'write-only'
        }
        if (bindingDesc.visibility) visibility = bindingDesc.visibility

        this.textureBindings.push({
            texture: bindingDesc.texture.use(),
            callbackIndex: bindingDesc.texture.registerCallback(() => { this.createTextureBindGroup() }),

            asStorage: asStorage,
            visibility: visibility,
            accessibility: accessibility,

            sampleType: bindingDesc.sampleType || 'float',
            multisampled: bindingDesc.multisampled !== undefined ? bindingDesc.multisampled : false,

            viewDimension: bindingDesc.viewDimension || '2d',
        })
    }

    /**
     * @param {number} index 
     * @param {SamplerDescription} samplerDesc 
     */
    addSampler(index, samplerDesc) {

        const device = getDevice()

        this.samplerBindings[index] = {
            sampler: device.createSampler({
                label: `Sampler (${samplerDesc.name})`,
                maxAnisotropy: samplerDesc.maxAnisotropy,

                minFilter: samplerDesc.filterMinMag.length > 0 ? samplerDesc.filterMinMag[0] : 'linear',
                magFilter: samplerDesc.filterMinMag.length > 1 ? samplerDesc.filterMinMag[1] : 'linear',
                addressModeU: samplerDesc.addressModeUVW.length > 0 ? samplerDesc.addressModeUVW[0] : 'repeat',
                addressModeV: samplerDesc.addressModeUVW.length > 1 ? samplerDesc.addressModeUVW[1] : 'repeat',
                addressModeW: samplerDesc.addressModeUVW.length > 2 ? samplerDesc.addressModeUVW[2] : 'repeat',

                ...(samplerDesc.mipmap && { mipmapFilter: samplerDesc.mipmap }),
                
            }),
            bindingType: samplerDesc.bindingType || 'filtering',
            visibility: samplerDesc.visibility || GPUShaderStage.FRAGMENT,
        };
    }

    // /**
    //  * @param {Shader} shader 
    //  */
    // afterShaderComplete(shader) {
        
    //     if (!this.uniforms.length || this.uniformBufferReady) return

    //     let blocks = []
    //     for (const uniform of this.uniforms) {

    //         uniform.ref.view = makeStructuredView(shader.defs.uniforms[uniform.ref.name])

    //         blocks.push(uniform.ref)
    //     }

    //     /**
    //      * Create the uniform buffer
    //      * @type {UniformBuffer}
    //      * Notation: a binding has only one uniform buffer
    //      */
    //     this.uniformBuffer = UniformBuffer.create({
    //         name: `Uniform buffer (${this.name})`,
    //         usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
    //         blocks: blocks
    //     }).use()

    //     this.updateUniformBlock()

    //     this.uniformBufferReady = true
    // }

    updateUniformBlock() {

        if (!this.uniforms.length) return

        this.uniformBuffer.update()
    }

    updateStorageBuffer() {

        for (const storageBinding of this.storageBindings) {
            storageBinding.buffer.update()
        }
    }

    updateVertexBuffer() {

        for (const vertexBinding of this.vertexBindings) {
            vertexBinding.buffer.update()
        }
    }

    updateTexture() {

        for (const textureBinding of this.textureBindings) {
            textureBinding.texture.update()
        }
    }

    createUniformBindGroupLayout() {

        if (!this.uniforms.length && !this.sharedUniforms.length) return

        const device = getDevice()

        /**
         * @type {Array<GPUBindGroupLayoutEntry>}
         */
        const entries = new Array(this.uniforms.length + this.sharedUniforms.length)
        let index = 0
        this.uniforms.concat(this.sharedUniforms).forEach(block => {
            entries[index] = {
                binding: index++,
                visibility: block.visibility,
                buffer: { type: 'uniform' }
            }
        })

        this.layouts[this.uniformOrder] = device.createBindGroupLayout({
            label: `Uniform binding group layout`,
            entries: entries
        })
    }

    createUniformBindGroup() {

        if (!this.uniforms.length && !this.sharedUniforms.length) return
        
        const device = getDevice()
        
        /**
         * @type {Array<GPUBindGroupEntry>}
         */
        const entries = new Array(this.uniforms.length + this.sharedUniforms.length)
        let index = 0
        this.uniforms.forEach(block => {
            const area = this.uniformBuffer.areaMap[block.ref.name]
            entries[index] = {
                binding: index++,
                resource: {
                    buffer: this.uniformBuffer.buffer, 
                    offset: area.start,
                    size: area.length
                }
            }
        })
        this.sharedUniforms.forEach(sharedUniform => {
            entries[index] = {
                binding: index++,
                resource: { buffer: sharedUniform.buffer.buffer }
            }
        })

        this.groups[this.uniformOrder] = device.createBindGroup({
            label: `Uniform binding group`,
            layout: this.layouts[this.uniformOrder],
            entries: entries
        })
    }

    createStorageBindGroupLayout() {

        if (!this.storageBindings.length) return
        
        const device = getDevice()

        /**
         * @type {Array<GPUBindGroupLayoutEntry>}
         */
        const entries = new Array(this.storageBindings.length)
        this.storageBindings.forEach((storageBinding, index) => {
            entries[index] = {
                binding: index,
                buffer: {type: storageBinding.type}, 
                visibility: storageBinding.visibility
            }
        })

        this.layouts[this.storageOrder] = device.createBindGroupLayout({
            label: `Storage binding group layout (${this.name})`,
            entries: entries
        })
    }

    createStorageBindGroup() {

        if (!this.storageBindings.length) return
        
        const device = getDevice()

        /**
         * @type {Array<GPUBindGroupEntry>}
         */
        const entries = new Array(this.storageBindings.length)
        this.storageBindings.forEach((storageBinding, index) => {
            entries[index] = {
                binding: index,
                resource: {buffer: storageBinding.buffer.buffer}
            }
        })

        this.groups[this.storageOrder] = device.createBindGroup({
            label: `Storage binding group (${this.name})`,
            layout: this.layouts[this.storageOrder],
            entries: entries
        })
    }

    createVertexBufferLayout() {
        /**
         * @type {Array<GPUVertexBufferLayout>}
         */
        let indexOffset = 0;
        this.vertexBindings.forEach((vertexBuffer, index) => {

            const attributes = new Array(vertexBuffer.buffer.attributes.length)
            vertexBuffer.buffer.attributes.forEach((attribute, index) => {
                attributes[index] = {
                    format: attribute.format,
                    shaderLocation: indexOffset++,
                    offset: attribute.offset
                }
            })

            this.vertexLayouts[index] = {
                arrayStride: vertexBuffer.buffer.stride,
                stepMode: vertexBuffer.stepMode,
                attributes: attributes
            }
        })
    }

    createTextureBindGroupLayout() {

        if (!this.samplerBindings.length && !this.textureBindings.length) return
        
        const device = getDevice()

        /**
         * @type {Array<GPUBindGroupLayoutEntry>}
         */
        const entries = new Array(this.samplerBindings.length + this.textureBindings.length)
        this.samplerBindings.concat(this.textureBindings).forEach((binding, index) => {
            
            entries[index] = {
                binding: index,
                visibility: binding.visibility,
                ...(binding.sampler && {
                    sampler: {type: binding.bindingType}
                }),
                ...(binding.texture && (!binding.asStorage) && {
                    texture: {sampleType: binding.sampleType, viewDimension: binding.viewDimension, multisampled: binding.multisampled}
                }),
                ...(binding.texture && binding.asStorage && {
                    storageTexture: {access: binding.accessibility, format: binding.texture.format}
                })
            }
        })

        this.layouts[this.textureOrder] = device.createBindGroupLayout({
            label: `Texture binding group layout`,
            entries: entries
        })
    }

    createTextureBindGroup() {

        if (!this.samplerBindings.length && !this.textureBindings.length) return
        
        const device = getDevice()
        
        /**
         * @type {Array<GPUBindGroupEntry>}
         */
        const entries= new Array(this.samplerBindings.length + this.textureBindings.length)
        this.samplerBindings.concat(this.textureBindings).forEach((binding, index) => {
            entries[index] = {
                binding: index,
                ...(binding.sampler && {
                    resource: binding.sampler
                }),
                ...(binding.texture && {
                    resource: binding.texture.view()
                })
            }
        })

        !this.layouts[this.textureOrder] && this.createTextureBindGroupLayout()
        this.groups[this.textureOrder] = device.createBindGroup({
            label: `Texture binding group (${this.name})`,
            layout: this.layouts[this.textureOrder],
            entries: entries
        })
    }

    crteateBindGroupLayouts() {
        
        this.createVertexBufferLayout()
        this.createUniformBindGroupLayout()
        this.createStorageBindGroupLayout()
        this.createTextureBindGroupLayout()
    }

    createBindGroups() {

        this.createUniformBindGroup()
        this.createStorageBindGroup()
        this.createTextureBindGroup()
    }

    tryMakeComplete() {

        if (this.isComplete) return true
        if (this.released) return false

        for (const textureBinding of this.textureBindings) {
            if (!textureBinding.texture.texture) {
                return false
            }
        }

        // this.uniforms.length && this.afterShaderComplete(shader)

        this.crteateBindGroupLayouts()
        
        this.createBindGroups()

        this.isComplete = true
        return true
    }
    
    update() {

        // Used to be the update method of the binding
        // {
        //     this.indirectBinding && this.indirectBinding.buffer.update()
        //     this.indexBinding && this.indexBinding.buffer.update()
        //     this.updateStorageBuffer()
        //     this.updateVertexBuffer()
        //     this.updateUniformBlock()
        // }
        // this.updateTexture()

    }

    getIndirect() {

        return this.indirectBinding
    }

    getBindGroupLayouts() {

        return this.layouts
    }

    getBindGroups() {

        return this.groups
    }

    getVertexLayouts() {

        return this.vertexLayouts
    }

    /**
     * 
     * @param {GPURenderPassEncoder | GPUComputePassEncoder} pass 
     */
    setBindGroups(pass) {

        this.groups.forEach((group, index) => {
            pass.setBindGroup(index, group);
        });
    }

    /**
     * 
     * @param {GPURenderPassEncoder} pass 
     */
    setVertexBuffers(pass) {

        this.vertexBindings.forEach((vertexBinding, index) => {
            pass.setVertexBuffer(index, vertexBinding.buffer.buffer)
        })
    }

    getShader() {
        return this.shader.shaderModule
    }

    getIndex() {
        return this.indexBinding ? this.indexBinding.buffer : undefined
    }

    use() {

        this.refCount++
        return this
    }

    release() {

        if (--this.refCount === 0) this.destroy()
        return null
    }

    destroy() {

        this.isComplete = false
        this.released = true

        this.uniforms.forEach(block => {
            block.ref = block.ref?.release()
            block.visibility = null
            block.name = null
            block.view = null
            block.map = null
        })
        this.uniforms = []

        this.sharedUniforms.forEach(sharedUniform => {
            sharedUniform.buffer = sharedUniform.buffer.release()
            sharedUniform.visibility = null
        })
        this.sharedUniforms = []

        if (this.indexBinding) {
            this.indexBinding.buffer = this.indexBinding.buffer.release()
            this.indexBinding = null
        }
    
        if (this.indirectBinding) {
            this.indirectBinding.buffer = this.indirectBinding.buffer.release()
            this.indirectBinding = null
        }
    
        this.vertexBindings.forEach(binding => {
            binding.buffer = binding.buffer.release()
            binding.visibility = null
            binding.stepMode = null
        })
        this.vertexBindings = []
    
        this.storageBindings.forEach(binding => {
            binding.buffer = binding.buffer.release()
            binding.visibility = null
            binding.type = null
        })
        this.storageBindings = []

        this.textureBindings.forEach(binding => {
            binding.callbackIndex = binding.texture.removeCallback(binding.callbackIndex)
            binding.texture = binding.texture.release()
            binding.viewDimension = null
            binding.accessibility = null
            binding.multisampled = null
            binding.sampleType = null
            binding.visibility = null
            binding.asStorage = null
        })
        this.textureBindings = []
    
        this.samplerBindings.forEach(binding => {
            binding.bindingType = null
            binding.visibility = null
            binding.sampler = null
        })
        this.samplerBindings = []
    
        this.vertexLayouts.forEach(layout => layout = null)
        this.layouts.forEach(layout => layout = null)
        this.groups.forEach(group => group = null)
        this.vertexLayouts = []
        this.layouts = []
        this.groups = []
    
        this.uniformBuffer = this.uniformBuffer?.release()
        this.refCount = null
        this.name = null

        return null
    }
}

export {
    Binding,
}