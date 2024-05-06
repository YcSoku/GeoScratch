import { aRef } from '../../core/data/arrayRef.js'
import { bRef } from '../../core/data/blockRef.js'
import { Node2D } from '../../core/quadTree/node2D.js'
import { plane } from '../../core/geometry/plane/plane.js'
import { binding } from '../../platform/binding/binding.js'
import { texture } from '../../platform/texture/texture.js'
import { sampler } from '../../platform/sampler/sampler.js'
import imageLoader from '../../resource/image/imageLoader.js'
import { renderPass } from '../../platform/pass/renderPass.js'
import { boundingBox2D } from '../../core/box/boundingBox2D.js'
import shaderLoader from '../../resource/shader/shaderLoader.js'
import { NoBlending } from '../../platform/blending/blending.js'
import { computePass } from '../../platform/pass/computePass.js'
import { f32, vec2f } from '../../core/numericType/numericType.js'
import { indexBuffer } from '../../platform/buffer/indexBuffer.js'
import { vertexBuffer } from '../../platform/buffer/vertexBuffer.js'
import { storageBuffer } from '../../platform/buffer/storageBuffer.js'
import { uniformBuffer } from '../../platform/buffer/uniformBuffer.js'
import { renderPipeline } from '../../platform/pipeline/renderPipeline.js'
import { computePipeline } from '../../platform/pipeline/computePipeline.js'

export class LocalTerrain {

    constructor(maxLevel) {

        ///////// Initialize CPU resource /////////
        this.asLine = 0
        this.nodeCount = 0
        this.maxLevel = maxLevel
        this.maxBindingUsedNum = 1000

        this.sectorSize = f32(32)
        this.sectorRange = vec2f()
        this.exaggeration = f32(50.)
        this.tileBox = boundingBox2D()
        this.lodMapSize = vec2f(512, 256)
        this.visibleNodeLevel = vec2f(0, this.maxLevel)
        this.elevationRange = vec2f(-80.06899999999999, 4.3745)
        this.boundaryCondition = boundingBox2D(
            120.0437360613468201,
            31.17390195220948710,
            121.9662324011692220,
            32.08401085804678130,
        )

        this.nodeLevelArray = aRef(new Uint32Array(this.maxBindingUsedNum), 'Storage (Node level)')
        this.nodeBoxArray = aRef(new Float32Array(this.maxBindingUsedNum * 4), 'Storage (Node bBox)')

        ///////// Initialize GPU resource /////////

        // Attributes
        this.indexNum = 0
        this.blockSizeX = 16
        this.blockSizeY = 16
        this.groupSizeX = Math.ceil(this.lodMapSize.x / this.blockSizeX)
        this.groupSizeY = Math.ceil(this.lodMapSize.y / this.blockSizeY)

        // Buffer-released resource
        this.tileBuffer
        this.indexBuffer
        this.staticBuffer
        this.nodeBoxBuffer
        this.positionBuffer
        this.nodeLevelBuffer

        // Texture-related resource
        this.lSampler
        this.demTexture
        this.borderTexture
        this.lodMapTexture
        this.dLodMapTexture

        // Binding
        this.meshBinding
        this.lodMapBinding
        this.dLodMapBinding

        // Pipeline
        this.lodMapPipeline
        this.dLodMapPipeline
        this.meshRenderPipeline

        // Pass
        this.lodMapPass
        this.dLodMapPass
    }

    setResource(gDynamicBuffer) {

        // Buffer-related resource
        const { positions, indices } = plane(Math.log2(this.sectorSize.n))
        console.log(indices.length)
        this.indexNum = indices.length
        this.positionBuffer = vertexBuffer({
            name: 'Vertex Buffer (Terrain Position)',
            randomAccessible: true,
            resource: { arrayRef: aRef(new Float32Array(positions)), structure: [ { components: 2 } ] }
        })
        this.indexBuffer = indexBuffer({
            name: 'Index Buffer (Terrain Index)',
            randomAccessible: true,
            resource: { arrayRef: aRef(new Uint32Array(indices)) }
        })
        this.nodeLevelBuffer = storageBuffer({
            name: 'Storage Buffer (Node level)',
            resource: { arrayRef: this.nodeLevelArray }
        })
        this.nodeBoxBuffer = storageBuffer({
            name: 'Storage Buffer (Node bBox)',
            resource: { arrayRef: this.nodeBoxArray }
        })
        this.tileBuffer = uniformBuffer({
            name: 'Uniform Buffer (Tile global dynamic)',
            blocks: [
                bRef({
                    name: 'tileUniform',
                    dynamic: true,
                    map: {
                        tileBox: this.tileBox.boundary,
                        sectorRange: this.sectorRange,
                        sectorSize: this.sectorSize,
                        exaggeration: this.exaggeration,
                    }
                }),
            ]
        })
        this.staticBuffer = uniformBuffer({
            name: 'Uniform Buffer (Terrain global static status)',
            blocks: [
                bRef({
                    name: 'block',
                    map: {
                        terrainBox: this.boundaryCondition.boundary,
                        e: this.elevationRange,
                    }
                }),
            ]
        })

        // Texture-related resource
        this.lSampler = sampler({
            name: 'Sampler (linear)',
            filterMinMag: ['linear', 'linear'],
            addressModeUVW: ['clamp-to-edge', 'clamp-to-edge'],
        })
        this.demTexture = imageLoader.load('Texture (DEM)', '/images/examples/terrain/dem.png')
        this.borderTexture = imageLoader.load('Texture (DEM Border)', '/images/examples/terrain/border.png')
        this.lodMapTexture = texture({
            name: 'Texture (LoD Map)',
            format: 'r8uint',
            resource: { size: () => this.lodMapSize.array }
        })
        this.dLodMapTexture = texture({
            name: 'Texture (Delta LoD Level Map)',
            computable: true,
            format: 'r32uint',
            resource: { size: () => this.lodMapSize.array }
        })

        // Binding
        this.lodMapBinding = binding({
            name: `Binding (Terrain LoDMap)`,
            range: () => [ 4, this.nodeCount ],
            uniforms: [
                {
                    name: 'mapUniform',
                    map: {
                        dimensions: this.lodMapSize,
                    }
                }
            ],
            sharedUniforms: [
                { buffer: this.tileBuffer },
                { buffer: this.staticBuffer },
            ],
            storages: [
                { buffer: this.nodeLevelBuffer },
                { buffer: this.nodeBoxBuffer },
            ],
        })
        this.dLodMapBinding = binding({
            name: 'Binding (Terrain LoD Level Delta Map)',
            range: () => [ this.blockSizeX, this.blockSizeY ],
            textures: [
                { texture: this.lodMapTexture, sampleType: 'uint' },
                { texture: this.dLodMapTexture, asStorage: true, sampleType: 'uint' }
            ],
        })
        this.showBinding = binding({
            name: 'Binding (Texture Shower)',
            range: () => [ 4 ],
            textures: [
                { texture: this.dLodMapTexture, sampleType: 'uint' },
            ],
        })
        this.meshBinding = binding({
            name: `Binding (Terrain Node)`,
            range: () => [ this.indexNum / 3 * (this.asLine ? 6 : 3), this.nodeCount ],
            sharedUniforms: [
                { buffer: this.tileBuffer },
                { buffer: this.staticBuffer },
                { buffer: gDynamicBuffer }
            ],
            textures: [
                { texture: this.demTexture },
                { texture: this.lodMapTexture, sampleType: 'uint' },
                { texture: this.dLodMapTexture, sampleType: 'uint' },
            ],
            storages: [
                { buffer: this.indexBuffer },
                { buffer: this.positionBuffer },
                { buffer: this.nodeLevelBuffer },
                { buffer: this.nodeBoxBuffer },
            ],
        })

        // Pipeline
        this.lodMapPipeline = renderPipeline({
            name: 'Render Pipeline (LoD Mapping)',
            shader: { module: shaderLoader.load('Shader (LoD Mapping)', '/shaders/examples/terrain/lodMap.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })
        this.dLodMapPipeline = computePipeline({
            name: 'Compute Pipeline (LoD Level Delta Mapping)',
            shader: { module: shaderLoader.load('Shader (LoD Level Delta Mapping)', '/shaders/examples/terrain/dLodmap.compute.wgsl') },
            constants: { blockSize: 16 },
        })
        this.meshRenderPipeline = 
        this.asLine
        ? 
        renderPipeline({
            name: 'Render Pipeline (Terrain Mesh Line)',
            shader: { module: shaderLoader.load('Shader (Terrain Mesh Line)', '/shaders/examples/terrain/terrainMeshLine.wgsl') },
            primitive: { topology: 'line-list' },
        })
        :
        renderPipeline({
            name: 'Render Pipeline (Terrain Mesh)',
            shader: { module: shaderLoader.load('Shader (Terrain Mesh)', '/shaders/examples/terrain/terrainMesh.wgsl') },
            colorTargetStates: [ { blend: NoBlending } ],
        })
        this.showerPipeline = renderPipeline({
            name: 'Render Pipelien (Texture Shower)',
            shader: { module: shaderLoader.load('Shader (Texture Shower)', '/shaders/examples/terrain/textureShower.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })

        // Pass
        this.lodMapPass = renderPass({
            name: 'Render Pass (LoD Map)',
            colorAttachments: [ { colorResource: this.lodMapTexture } ]
        }).add(this.lodMapPipeline, this.lodMapBinding)
        this.dLodMapPass = computePass({
            name: 'Compute Pass (Lod Delta Level Map)',
        }).add(this.dLodMapPipeline, this.dLodMapBinding)

        return this
    }

    set minVisibleNodeLevel (min) {
        this.visibleNodeLevel.x = min
    }

    get minVisibleNodeLevel () {
        return this.visibleNodeLevel.x
    }

    set maxVisibleNodeLevel (max) {
        this.visibleNodeLevel.y = max
    }

    get maxVisibleNodeLevel () {
        return this.visibleNodeLevel.y
    }

    get pipeline() {

        return this.meshRenderPipeline
    }

    get binding() {

        return this.meshBinding
    }

    /**
     * @param {MapOptions} options 
     */
    registerRenderableNode(options) {
        
        // Reset uiform-related member per frame
        this.tileBox.reset()
        this.sectorRange.reset()
        this.nodeCount = 0
        this.maxVisibleNodeLevel = 0
        this.minVisibleNodeLevel = this.maxLevel

        // Find visible terrain nodes
        /** @type { Node2D[] } */ const stack = [] 
        /** @type { Node2D[] } */ const visibleNode = []
        stack.push(new Node2D(0, 0))
        stack.push(new Node2D(0, 1))
        while(stack.length > 0) {
            
            let node = stack.pop()

            // Termination condition #1
            if (!node.bBox.overlap(this.boundaryCondition)) continue
            // Termination condition #2
            if (!node.isSubdividable(options) || node.level >= Math.min(this.maxLevel, options.zoomLevel)) {
                
                visibleNode.push(node)
                // Update the sector size used for rendering
                if (node.level > this.maxVisibleNodeLevel) {

                    this.sectorRange.x = node.bBox.size[0]
                    this.sectorRange.y = node.bBox.size[1]
                    this.maxVisibleNodeLevel = node.level
                }
                continue
            }

            // If the terrain node is subdividable
            // Create its child nodes
            for (let i = 0; i < 4; i++) {

                node.children[i] = new Node2D(node.level + 1, 4 * node.id + i, node)
                stack.push(node.children[i])
            }
        }

        // Further determinate the real visible nodes
        // Give priority to high-level ones ?
        visibleNode./*sort((a, b) => a.level - b.level).*/forEach(node => {

            if (/* node.isVisible(options) && */this.nodeCount < this.maxBindingUsedNum && node.level + 5 >= this.maxVisibleNodeLevel) {

                this.minVisibleNodeLevel = node.level < this.minVisibleNodeLevel ? node.level : this.minVisibleNodeLevel
                this.tileBox.updateByBox(node.bBox)
    
                this.nodeLevelArray.element(this.nodeCount, node.level)
                this.nodeBoxArray.element(this.nodeCount * 4 + 0, node.bBox.boundary.x)
                this.nodeBoxArray.element(this.nodeCount * 4 + 1, node.bBox.boundary.y)
                this.nodeBoxArray.element(this.nodeCount * 4 + 2, node.bBox.boundary.z)
                this.nodeBoxArray.element(this.nodeCount * 4 + 3, node.bBox.boundary.w)
    
                this.nodeCount++
            }

            node.release()
        })
        console.log(this.nodeCount)
    }
}