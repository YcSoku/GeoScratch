import { BoundingBox2D } from '../../core/box/boundingBox2D.js'
import { aRef } from '../../core/data/arrayRef.js'
import { bRef } from '../../core/data/blockRef.js'
import { storageBuffer } from '../../platform/buffer/storageBuffer.js'
import { binding } from '../../platform/binding/binding.js'
import { asF32, asVec2f, asVec4f, vec2f } from '../../core/numericType/numericType.js'
import { renderPipeline } from '../../platform/pipeline/renderPipeline.js'
import { Node2D } from '../../core/quadTree/node2D.js'
import { texture } from '../../platform/texture/texture.js'
import { sampler } from '../../platform/sampler/sampler.js'
import { vertexBuffer } from '../../platform/buffer/vertexBuffer.js'
import { indexBuffer } from '../../platform/buffer/indexBuffer.js'
import { plane } from '../../core/geometry/plane/plane.js'
import imageLoader from '../../resource/image/imageLoader.js'
import shaderLoader from '../../resource/shader/shaderLoader.js'
import { renderPass } from '../../platform/pass/renderPass.js'
import { NoBlending } from '../../platform/blending/blending.js'


const boundaryCondition = BoundingBox2D.create(
    120.0437360613468201,
    31.1739019522094871,
    121.9662324011692220,
    32.0840108580467813,
)

export class LocalTerrain {

    constructor(maxLevel) {

        ///////// Initialize CPU resource /////////
        this.sectorSize = vec2f()
        this.tileBox = new BoundingBox2D()

        this.asLine = 0
        this.bindingUsed = 0
        this.maxLevel = maxLevel
        this.maxBindingUsedNum = 5000

        this.visibleNodeLevel = vec2f(0, this.maxLevel)

        this.nodeLevelArray = aRef(new Uint32Array(this.maxBindingUsedNum), 'Storage (Node level)')
        this.nodeBoxArray = aRef(new Float32Array(this.maxBindingUsedNum * 4), 'Storage (Node bBox)')

        ///////// Initialize GPU resource /////////
        this.lSampler = sampler({
            name: 'Sampler (linear)',
            filterMinMag: ['linear', 'linear'],
            addressModeUVW: ['clamp-to-edge', 'clamp-to-edge'],
            mipmap: 'linear',
        })
        this.demTexture = imageLoader.load('Texture (DEM)', '/images/examples/terrain/dem.png')
        this.borderTexture = imageLoader.load('Texture (DEM Border)', '/images/examples/terrain/border.png')
        this.paletteTexture = imageLoader.load('Texture (DEM Palette)', '/images/examples/terrain/demPalette10.png')
        this.lodMapTexture = texture({
            name: 'Texture (LOD Map)',
            resource: { size: () => [ 256, 256 ] }
        })

        // Buffer-released resource
        const { positions, indices } = plane(5)
        this.indexNum = indices.length
        this.positionBuffer = vertexBuffer({
            name: 'Vertex Buffer (Terrain Position)',
            randomAccessible: true,
            resource: { arrayRef: aRef(new Float32Array(positions)), structure: [{components: 2}] }
        }).use()
        this.indexBuffer = indexBuffer({
            name: 'Index Buffer (Terrain Index)',
            randomAccessible: true,
            resource: { arrayRef: aRef(new Uint32Array(indices)) }
        }).use()
        this.nodeLevelBuffer = storageBuffer({
            name: 'Storage Buffer (Node level)',
            resource: { arrayRef: this.nodeLevelArray }
        }).use()
        this.nodeBoxBuffer = storageBuffer({
            name: 'Storage Buffer (Node bBox)',
            resource: { arrayRef: this.nodeBoxArray }
        }).use()

        this.lodMapBinding = undefined
        this.meshBinding = undefined

        this.lodMapPipeline = renderPipeline({
            name: 'Render Pipeline (LOD Map)',
            shader: { module: shaderLoader.load('Shader (Terrain Mesh)', '/shaders/examples/terrain/lodMap.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })
        this.meshRenderPipeline = renderPipeline({
            name: 'Render Pipeline (Terrain Mesh)',
            shader: { module: shaderLoader.load('Shader (Terrain Mesh)', '/shaders/examples/terrain/terrainMesh.wgsl') },
            colorTargetStates: [ { blend: NoBlending } ],
            depthTest: true,
        })
        this.meshLineRenderPipeline = renderPipeline({
            name: 'Render Pipeline (Terrain Mesh)',
            shader: { module: shaderLoader.load('Shader (Terrain Mesh Line)', '/shaders/examples/terrain/terrainMeshLine.wgsl') },
            depthTest: true,
            primitive: { topology: 'line-list' },
        })

        this.lodMapPass = undefined
        this.meshRenderPass = undefined
    }

    setBinding(gStaticBuffer, gDynamicBuffer) {

        this.lodMapBinding = binding({
            name: `Binding (Terrain LoDMap)`,
            range: () => [ 4, this.bindingUsed ],
            sharedUniforms: [
                { buffer: gStaticBuffer },
            ],
            uniforms: [
                {
                    name: 'tileUniform',
                    dynamic: true,
                    map: {
                        tileBox: this.tileBox.boundary,
                        levelRange: this.visibleNodeLevel,
                        sectorSize: this.sectorSize
                    }
                }
            ],
            storages: [
                { buffer: this.nodeLevelBuffer },
                { buffer: this.nodeBoxBuffer },
            ],
        })

        this.meshBinding = binding({
            name: `Binding (Terrain Node)`,
            range: () => [ this.indexNum / 3 * (this.asLine ? 6 : 3), this.bindingUsed ],
            uniforms: [
                {
                    name: 'tileUniform',
                    dynamic: true,
                    map: {
                        tileBox: this.tileBox.boundary,
                        levelRange: this.visibleNodeLevel,
                        sectorSize: this.sectorSize
                    }
                }
            ],
            sharedUniforms: [
                { buffer: gStaticBuffer },
                { buffer: gDynamicBuffer }
            ],
            samplers: [ {sampler: this.lSampler} ],
            textures: [
                { texture: this.demTexture },
                { texture: this.borderTexture },
                { texture: this.lodMapTexture },
                { texture: this.paletteTexture },
            ],
            storages: [
                { buffer: this.indexBuffer },
                { buffer: this.positionBuffer },
                { buffer: this.nodeLevelBuffer },
                { buffer: this.nodeBoxBuffer },
            ],
        })

        return this
    }

    setPass(colorTexture, depthTexture) {

        this.lodMapPass = renderPass({
            name: 'Render Pass (LOD Map)',
            colorAttachments: [ { colorResource: this.lodMapTexture } ]
        }).add(this.lodMapPipeline, this.lodMapBinding)

        this.meshRenderPass = renderPass({
            name: 'Render Pass (Water DEM)',
            colorAttachments: [ { colorResource: colorTexture } ],
            depthStencilAttachment: { depthStencilResource: depthTexture }
        }).add(this.asLine ? this.meshLineRenderPipeline : this.meshRenderPipeline, this.meshBinding)

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

    /**
     * @param {MapOptions} options 
     */
    registerRenderableNode(options) {
        
        // Reset uiform-related member per frame
        this.tileBox.reset()
        this.sectorSize.reset()
        this.bindingUsed = 0
        this.maxVisibleNodeLevel = 0
        this.minVisibleNodeLevel = this.maxLevel

        // Find visible terrain nodes
        /** @type { Node2D[] } */ const stack = [] 
        /** @type { Node2D[] } */ const visibleNode = []
        stack.push(new Node2D(0, 0))
        while(stack.length > 0) {
            
            let node = stack.pop()

            // Termination condition #1
            if (!node.bBox.overlap(boundaryCondition)) continue
            // Termination condition #2
            if (!node.isSubdividable(options) || node.level >= Math.min(this.maxLevel, options.zoomLevel)) {
                
                visibleNode.push(node)
                // Update the sector size used for rendering
                if (node.level > this.maxVisibleNodeLevel) {

                    this.sectorSize.x = node.bBox.size[0]
                    this.sectorSize.y = node.bBox.size[1]
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

            if (this.bindingUsed < this.maxBindingUsedNum && node.level + 5 >= this.maxVisibleNodeLevel) {

                this.minVisibleNodeLevel = node.level < this.minVisibleNodeLevel ? node.level : this.minVisibleNodeLevel
                this.tileBox.updateByBox(node.bBox)
    
                this.nodeLevelArray.element(this.bindingUsed, node.level)
                this.nodeBoxArray.element(this.bindingUsed * 4 + 0, node.bBox.boundary.x)
                this.nodeBoxArray.element(this.bindingUsed * 4 + 1, node.bBox.boundary.y)
                this.nodeBoxArray.element(this.bindingUsed * 4 + 2, node.bBox.boundary.z)
                this.nodeBoxArray.element(this.bindingUsed * 4 + 3, node.bBox.boundary.w)
    
                this.bindingUsed++
            }

            node.release()
        })
    }
}