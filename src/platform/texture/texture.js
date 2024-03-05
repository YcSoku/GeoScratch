import { UUID } from '../../core/utils/uuid.js'
import getDevice from '../context/device.js'
import director from '../director/director.js'
import monitor from '../monitor/monitor.js'

const numMipLevels = (...sizes) => {
    const maxSize = Math.max(...sizes)
    return 1 + Math.log2(maxSize) | 0
}

const generateMips = (() => {
    let sampler
    let module
    const pipelineByFormat = {}
 
    return function generateMips(texture) {

        const device = getDevice()
        if (!module) {
        module = device.createShaderModule({
            label: 'textured quad shaders for mip level generation',
            code: `
            struct VSOutput {
                @builtin(position) position: vec4f,
                @location(0) texcoord: vec2f,
            };

            @vertex fn vs(
                @builtin(vertex_index) vertexIndex : u32
            ) -> VSOutput {
                let pos = array(

                vec2f( 0.0,  0.0),  // center
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 0.0,  1.0),  // center, top

                // 2st triangle
                vec2f( 0.0,  1.0),  // center, top
                vec2f( 1.0,  0.0),  // right, center
                vec2f( 1.0,  1.0),  // right, top
                );

                var vsOutput: VSOutput;
                let xy = pos[vertexIndex];
                vsOutput.position = vec4f(xy * 2.0 - 1.0, 0.0, 1.0);
                vsOutput.texcoord = vec2f(xy.x, 1.0 - xy.y);
                return vsOutput;
            }

            @group(0) @binding(0) var ourSampler: sampler;
            @group(0) @binding(1) var ourTexture: texture_2d<f32>;

            @fragment fn fs(fsInput: VSOutput) -> @location(0) vec4f {
                return textureSample(ourTexture, ourSampler, fsInput.texcoord);
            }
            `,
        });

        sampler = device.createSampler({
            minFilter: 'linear',
            addressModeU: 'clamp-to-edge',
            addressModeV: 'clamp-to-edge',
        });
        }

        if (!pipelineByFormat[texture.format]) {
            pipelineByFormat[texture.format] = device.createRenderPipeline({
                label: 'mip level generator pipeline',
                layout: 'auto',
                vertex: {
                    module,
                    entryPoint: 'vs',
                },
                fragment: {
                    module,
                    entryPoint: 'fs',
                    targets: [{ format: texture.format }],
                },
            });
        }
        const pipeline = pipelineByFormat[texture.format]

        const encoder = device.createCommandEncoder({ label: 'mip gen encoder' })

        let width = texture.width
        let height = texture.height
        let baseMipLevel = 0
        while (width > 1 || height > 1) {
            width = Math.max(1, Math.ceil(width / 2) | 0);
            height = Math.max(1, Math.ceil(height / 2) | 0);

            const bindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(0),
                entries: [
                    { binding: 0, resource: sampler },
                    { binding: 1, resource: texture.createView({baseMipLevel, mipLevelCount: 1}) },
                ],
            })

            ++baseMipLevel

            const renderPassDescriptor = {
                label: 'our basic canvas renderPass',
                colorAttachments: [
                {
                    view: texture.createView({baseMipLevel, mipLevelCount: 1}),
                    loadOp: 'clear',
                    storeOp: 'store',
                },
                ],
            }

            const pass = encoder.beginRenderPass(renderPassDescriptor)
            pass.setPipeline(pipeline)
            pass.setBindGroup(0, bindGroup)
            pass.draw(6)
            pass.end()
        }

        device.queue.submit([encoder.finish()])
    }
})()

/**
 * @typedef {Object} TextureResourceDescription
 * @property {'imageBitmap' | 'buffer' | 'data' | 'size' | 'canvasTexture'} [dataType]
 * @property {Function} [imageBitmap]
 * @property {Function} [resource]
 * @property {Function} [canvasTexture]
 * @property {Function} [size]
 */

/**
 * @typedef {Object} TextureDescription
 * @property {string} [name]
 * @property {number} [usage]
 * @property {boolean} [flipY]
 * @property {boolean} [mipMapped]
 * @property {boolean} [computable]
 * @property {GPUTextureFormat} [format]
 * @property {TextureResourceDescription} [resource]
 */

class Texture {

    /**
     * 
     * @param {TextureDescription} description 
     */
    constructor(description) {

        this.uuid = UUID()
        
        this.refCount = 0
        this.name = description.name ? description.name : 'Texture'
        this.resource = description.resource
        this.resource.dataType = description.resource.dataType ? description.resource.dataType : 'size'
        this.flipY = (description.flipY !== undefined) ? description.flipY : true
        this.computable = description.computable ? description.computable : false
        this.usage = description.usage ? description.usage : (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC)
        if (this.computable) this.usage = GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC
        this.format = description.format ? description.format : 'rgba8unorm'
        this.mipMapped = description.mipMapped ? description.mipMapped : false
        /**
         * @type {'clean' | 'imageBitmap' | 'buffer' | 'data' | 'size' | 'canvasTexture'}
         */
        this.dirtyType = this.resource.dataType

        /**
         * @type {{[dirtyType: string]: Function}}
         */
        this.executeUpdate = {
            'clean': () => this.updateWhenClean(),
            'imageBitmap': () => this.updateByImageBitmap(),
            'size': () => this.updateBySize(),
            'canvasTexture': () => this.updateByCanvasTexture(),
        }

        /**
         * @type {Array<Function>}
         */
        this.onChangeHandlers = []


        this.byteLength = 0;

        this.update()

        director.addTexture(this)
    }

    use() {

        this.refCount++
        return this
    }

    release() {

        if (--this.refCount === 0) this.destroy()
        return null
    }

    /**
     * 
     * @param {TextureDescription} description 
     */
    static create(description) {

        const texture = new Texture(description)

        return texture;
    }

    view() {
        return this.texture.createView({
            ...(this.mipMapped && {
                baseMipLevel: 0, 
                mipLevelCount: Math.max(this.texture.mipLevelCount, 1)
            })
        })
    }

    updateWhenClean() {}

    updateByImageBitmap() {

        const device = getDevice()

        if (this.texture) {
            monitor.memorySizeInBytes -= this.byteLength
            this.texture.destroy()
        }

        const {imageBitmap, id} = this.resource.imageBitmap()
        if (!imageBitmap) return

        let rgba8Texture = device.createTexture({
            label: `${this.name}`,
            size: [imageBitmap.width, imageBitmap.height],
            format: 'rgba8unorm',
            usage: this.usage,
            ...(this.mipMapped && {
                mipLevelCount: numMipLevels(imageBitmap.width, imageBitmap.height)
            })
        })

        device.queue.copyExternalImageToTexture(
            {source: imageBitmap, flipY: this.flipY},
            {texture: rgba8Texture},
            {width: imageBitmap.width, height: imageBitmap.height}
        )

        if (this.format === 'rgba8unorm') this.texture = rgba8Texture
        else {

            const componentNum = {
                'rg32float': 2,
            }
        
            if (!(this.format in componentNum)) {
                throw new Error(`Unsupported reparsed format: ${this.format}`)
            }
            const targetComponents = componentNum[this.format]

            // Reparsing
            const tempEncoder = device.createCommandEncoder()
            const tempBuffer = device.createBuffer({
              label: 'tempBuffer',
              size: rgba8Texture.width * rgba8Texture.height * 4,
              usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
            })
            tempEncoder.copyTextureToBuffer(
              { texture: rgba8Texture, mipLevel: 0, origin: [0, 0, 0], aspect: 'all' },
              { buffer: tempBuffer, offset: 0, bytesPerRow: rgba8Texture.width * 4, rowsPerImage: rgba8Texture.height },
              [rgba8Texture.width, rgba8Texture.height]
            )
      
            const parsedTexture = device.createTexture({
              label: this.name,
              format: this.format,
              size: [rgba8Texture.width / targetComponents, imageBitmap.height],
              usage: this.usage,
              ...(this.mipMapped && {
                  mipLevelCount: numMipLevels(rgba8Texture.width / targetComponents, imageBitmap.height)
              })
            })
            tempEncoder.copyBufferToTexture(
              { buffer: tempBuffer, offset: 0, bytesPerRow: rgba8Texture.width * 4, rowsPerImage: parsedTexture.height },
              { texture: parsedTexture, mipLevel: 0, origin: [0, 0, 0], aspect: 'all' },
              [parsedTexture.width, parsedTexture.height]
            )
            device.queue.submit([tempEncoder.finish()])
            
            rgba8Texture.destroy()
            tempBuffer.destroy()
            this.texture = parsedTexture
        }

        if (this.texture.mipLevelCount > 1) {
            generateMips(this.texture)
        }

        this.dirtyType = 'clean'
        
        this.getByteLength()
        monitor.memorySizeInBytes += this.byteLength
    }

    updateByCanvasTexture() {

        if (this.texture) {
            monitor.memorySizeInBytes -= this.byteLength
        }

        const gpuTexture = this.resource.canvasTexture()

        this.texture = gpuTexture
        this.dirtyType = 'clean'
        
        this.getByteLength()
        monitor.memorySizeInBytes += this.byteLength
    }

    updateBySize() {

        const device = getDevice()

        if (this.texture) {
            monitor.memorySizeInBytes -= this.byteLength
            this.texture.destroy()
        }

        this.texture = device.createTexture({
            label: `${this.name}`,
            size: this.resource.size(),
            format: this.format,
            usage: this.usage,
            ...(this.mipMapped && {
                mipLevelCount: numMipLevels(...this.resource.size())
            })
        })

        if (this.texture.mipLevelCount > 1) {
            generateMips(this.texture)
        }

        this.dirtyType = 'clean'

        this.getByteLength()
        monitor.memorySizeInBytes += this.byteLength
    }

    getByteLength()  {

        const formatSize = {
            'r8unorm': 1,
            'r16float': 2,
            'rg8unorm': 2,
            'r32float': 4,
            'rg32float': 4,
            'rg16float': 4,
            'rgba8unorm': 4,
            'bgra8unorm': 4,
            'rgba16float': 8,
            'rgba32float': 16,
            'depth24plus': 3,
            'depth32float': 4,
        }
    
        if (!(this.format in formatSize)) {
            throw new Error(`Unsupported format: ${this.format}`)
        }
    
        let singleLayerSize = this.texture.width * this.texture.height * formatSize[this.format]
    
        this.byteLength = 0
        let currentWidth = this.texture.width
        let currentHeight = this.texture.height
        if (this.mipMapped) {
            while (currentWidth > 1 || currentHeight > 1) {
                this.byteLength += singleLayerSize
                currentWidth = Math.max(1, currentWidth / 2)
                currentHeight = Math.max(1, currentHeight / 2)
                singleLayerSize = currentWidth * currentHeight * formatSize[this.format]
            }
        }
    
        this.byteLength += singleLayerSize;
    }

    update() {

        this.executeUpdate[this.dirtyType](this)
    }

    /**
     * @param {TextureDescription} [description] 
     */
    reset(description) {
        
        if (description) {

            this.name = description.name ? description.name : this.name
            this.flipY = description.flipY ? description.flipY : this.flipY
            this.usage = description.usage ? description.usage : this.usage
            this.format = description.format ? description.format : this.format
            this.mipMapped = description.mipMapped ? description.mipMapped : this.mipMapped
            this.resource = description.resource 
            this.dirtyType = description.resource.dataType ? description.resource.dataType : 'size'
        } else {

            this.dirtyType = this.resource.dataType
        }

        this.update()

        // May Be Dangerous!
        this.onChangeHandlers.forEach(handler => handler && handler())
    }

    registerCallback(callback) {
        this.onChangeHandlers.push(callback)

        return this.onChangeHandlers.length - 1
    }

    removeCallback(index) {

        this.onChangeHandlers[index] = null
        return null
    }

    destroy() {

        if (this.texture) {
            this.texture.destroy()
            this.texture = null
        }

        director.removeTexture(this.uuid)

        this.uuid = null
        this.refCount = null
        this.name = null
        this.resource = null
        this.flipY = null
        this.computable = null
        this.usage = null
        this.format = null
        this.mipMapped = null
        this.dirtyType = null

        for (const key in this.executeUpdate) {
            this.executeUpdate[key] = null
        }
        this.executeUpdate = null

        this.onChangeHandlers.length = 0
        this.onChangeHandlers = null

        this.byteLength && (monitor.memorySizeInBytes -= this.byteLength)
        this.byteLength = 0
    }
}

export {
    Texture
}