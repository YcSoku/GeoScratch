import * as scr from '../../src/scratch.js'
import { Delaunay } from 'd3-delaunay'
import axios from 'axios'

function encodeFloatToDouble(value) {
    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
}

function triangulate(data) {

    const vertices = []
    const velocities = []
    let maxSpeed = 0.0
    data.forEach(station => {
        
        vertices.push(station.lon)
        vertices.push(station.lat)

        velocities.push(station.u)
        velocities.push(station.v)

        let speed = Math.sqrt(station.u * station.u + station.v * station.v)
        maxSpeed = speed > maxSpeed ? speed : maxSpeed
    })

    const meshes = new Delaunay(vertices)

    const positions = []
    for (let i = 0; i < meshes.points.length; i += 2) {

        const x = encodeFloatToDouble(scr.MercatorCoordinate.mercatorXfromLon(meshes.points[i + 0]))
        const y = encodeFloatToDouble(scr.MercatorCoordinate.mercatorYfromLat(meshes.points[i + 1]))
        positions.push(x[0])
        positions.push(y[0])
        positions.push(x[1])
        positions.push(y[1])
    }
    
    return { indices: meshes.triangles, maxSpeed, positions, velocities }
}

export default class FlowLayer {

    constructor(flowLayerDescriptionUrl) {

        // Layer
        this.type = 'custom'
        this.map = undefined
        this.id = 'FlowLayer'
        this.renderingMode = '3d'

        // Resource description
        this.url = flowLayerDescriptionUrl

        // Attributes
        this.preheat = 0
        this.swapPointer = 0
        this.maxSpeed = scr.f32()
        this.randomSeed = scr.f32(Math.random())

        // Compute configuration
        this.blockSizeX = 16
        this.blockSizeY = 16
        this.particleNum = 262144
        this.groupSizeX = Math.ceil(Math.sqrt(this.particleNum) / this.blockSizeX)
        this.groupSizeY = Math.ceil(Math.sqrt(this.particleNum) / this.blockSizeY)

        // Buffer-related resource
        this.extent = undefined
        this.particleRef = undefined
        this.randomFillData = undefined
        this.vertexBuffer_v = undefined
        this.vertexBuffer_pos = undefined
        this.indexBuffer_voronoi = undefined
        this.storageBuffer_particle = undefined

        // Texture-related resource
        this.flowTexture = undefined
        this.depthTexture = undefined
        this.layerTexture1 = undefined
        this.layerTexture2 = undefined

        // Binding
        this.showBinding = undefined
        this.swapBindings = undefined
        this.layerBindings = undefined
        this.voronoiBinding = undefined
        this.particleBinding = undefined
        this.simulationBinding = undefined

        // Pipeline
        this.voronoiPipeline = undefined

        // Pass
        this.flowPass = undefined
        this.swapPasses = undefined
        this.simulationPass = undefined

        // Flag
        this.isHided = false
        this.isIdling = false
        this.isInitialized = false
    }

    async onAdd(map, gl) {

        this.map = map

        const res = await axios.get(this.url)
        const { indices, maxSpeed, positions, velocities } = triangulate(res.data.stations)

        this.updateMaxSpeed(maxSpeed)
        this.extent = scr.boundingBox2D(120.0437360613468201, 31.1739019522094871, 121.9662324011692220, 32.0840108580467813)

        // Buffer-related resource
        this.indexBuffer_voronoi = scr.indexBuffer({
            name: 'IndexBuffer (Flow Voronoi)',
            resource: { arrayRef: scr.aRef(new Uint32Array(indices)) }
        })
        this.vertexBuffer_pos = scr.vertexBuffer({
            name: 'VertexBuffer (Station Pos)',
            resource: { arrayRef: scr.aRef(new Float32Array(positions)), structure: [ { components: 4 } ] }
        })
        this.vertexBuffer_v = scr.vertexBuffer({
            name: 'VertexBuffer (Flow Velocity)',
            resource: { arrayRef: scr.aRef(new Float32Array(velocities)), structure: [ { components: 2 } ] }
        })
        this.randomFillData = new Float32Array(this.particleNum * 4).map(() => Math.random())
        this.particleRef = scr.aRef(this.randomFillData)
        this.storageBuffer_particle = scr.storageBuffer({
            name: 'StorageBuffer (Particle Pos)',
            resource: { arrayRef: this.particleRef }
        })

        // Texture-related resource
        this.layerTexture1 = this.map.screen.createScreenDependentTexture('Texture (Background 1)')
        this.layerTexture2 = this.map.screen.createScreenDependentTexture('Texture (Background 2)')
        this.depthTexture = this.map.screen.createScreenDependentTexture('Texture (Flow Depth)', 'depth24plus')
        this.flowTexture = this.map.screen.createScreenDependentTexture('Texture (Flow Velocity)', 'rg32float')

        // Binding
        this.voronoiBinding = scr.binding({
            name: 'Binding (Flow Voronoi)',
            range: () => [ indices.length ],
            index: { buffer: this.indexBuffer_voronoi },
            vertices: [
                { buffer: this.vertexBuffer_pos },
                { buffer: this.vertexBuffer_v },
            ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        extent: this.extent.boundary,
                    }
                }
            ],
            sharedUniforms: [ { buffer: this.map.dynamicUniformBuffer } ],
        })
        this.simulationBinding = scr.binding({
            name: 'Binding (Particle Simulation)',
            range: () => [ this.groupSizeX, this.groupSizeY ],
            textures: [ { texture: this.flowTexture, sampleType: 'unfilterable-float' } ],
            storages: [ { buffer: this.storageBuffer_particle, writable: true } ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        groupSize: scr.asVec2u(this.groupSizeX, this.groupSizeY),
                        extent: this.extent.boundary,
                        maxSpeed: this.maxSpeed
                    }
                },
                {
                    name: 'frameUniform',
                    dynamic: true,
                    map: {
                        randomSeed: this.randomSeed,
                        viewPort: this.map.screen.sizeF,
                        mapBounds: this.map.cameraBounds.boundary,
                        zoomLevel: this.map.zoom,
                    }
                },
                {
                    name: 'controllerUniform',
                    map: {
                        particleNum: scr.asU32(this.particleNum),
                        dropRate: scr.asF32(0.003),
                        dropRateBump: scr.asF32(0.001),
                        speedFactor: scr.asF32(5.)
                    }
                }
            ],
            sharedUniforms: [ { buffer: this.map.dynamicUniformBuffer } ],
        })
        this.swapBindings = [
            scr.binding({
                name: 'Binding (Background Swap 1)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture2 } ]
            }),
            scr.binding({
                name: 'Binding (Background Swap 2)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture1 } ]
            }),
        ]
        this.particleBinding = scr.binding({
            name: 'Binding (Particles)',
            range: () => [ 4, this.particleNum ],
            textures: [ { texture: this.flowTexture, sampleType: 'unfilterable-float' } ],
            storages: [ { buffer: this.storageBuffer_particle } ],
            uniforms: [
                {
                    name: 'frameUniform',
                    dynamic: true,
                    map: {
                        mapBounds: this.map.cameraBounds.boundary,
                        viewPort: this.map.screen.sizeF,
                    }
                },
                {
                    name: 'staticUniform',
                    map: {
                        extent: this.extent.boundary,
                        maxSpeed: this.maxSpeed
                    }
                },
            ],
            sharedUniforms: [ { buffer: this.map.dynamicUniformBuffer } ],
        })
        this.layerBindings = [
            scr.binding({
                name: 'Binding (Layer Renderig 1)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture1 } ]
            }),
            scr.binding({
                name: 'Binding (Layer Renderig 2)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture2 } ]
            })
        ]
        this.showBinding = scr.binding({
            name: 'Binding (Flow Show)',
            range: () => [ 4 ],
            textures: [ { texture: this.flowTexture, sampleType: 'unfilterable-float' } ]
        })

        // Pipeline
        this.voronoiPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Flow Voronoi)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Voronoi)', '/shaders/examples/flow/flowVoronoi.wgsl') },
        })
        this.simulationPipeline = scr.computePipeline({
            name: 'Compute Pipeline (Flow Simulation)',
            shader: { module: scr.shaderLoader.load('Shader (Particle Simulation)', '/shaders/examples/flow/simulation.compute.wgsl') },
            constants: { blockSize: 16 },
        })
        this.swapPipeline = scr.renderPipeline({
            name: 'Rendej pipeline (Background Swap)', 
            shader: { module: scr.shaderLoader.load('Shader (Background Swap)', '/shaders/examples/flow/swap.wgsl') },
            primitive: { topology: 'triangle-strip' },
            depthTest: false
        })
        this.particlePipeline = scr.renderPipeline({
            name: 'Render Pipeline (Particles)',
            shader: { module: scr.shaderLoader.load('Shader (Particles)', '/shaders/examples/flow/particles.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })
        this.layerPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Layer Rendering)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Layer Rendering)', '/shaders/examples/flow/flowLayer.wgsl') },
            primitive: { topology: 'triangle-strip' },
            colorTargetStates: [ { blend: scr.NormalBlending } ]
        })
        this.showPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Flow Show)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Show)', '/shaders/examples/flow/flowShow.wgsl') },
            primitive: { topology: 'triangle-strip' }
        })

        // Pass
        this.flowPass = scr.renderPass({
            name: 'Render Pass (Flow velocity)',
            colorAttachments: [ { colorResource: this.flowTexture } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        }).add(this.voronoiPipeline, this.voronoiBinding)

        this.simulationPass = scr.computePass({
            name: 'Compute Pass (Particle Simulation)',
        }).add(this.simulationPipeline, this.simulationBinding)

        this.swapPasses = [
            scr.renderPass({
                name: 'Render Pass (Background Swap 1)',
                colorAttachments: [ { colorResource: this.layerTexture1, loadOp: 'load' } ],
                depthStencilAttachment: { depthStencilResource: this.depthTexture }
            }).add(this.swapPipeline, this.swapBindings[0]).add(this.particlePipeline, this.particleBinding),

            scr.renderPass({
                name: 'Render Pass (Background Swap 2)',
                colorAttachments: [ { colorResource: this.layerTexture2, loadOp: 'load' } ],
                depthStencilAttachment: { depthStencilResource: this.depthTexture }
            }).add(this.swapPipeline, this.swapBindings[1]).add(this.particlePipeline, this.particleBinding),

            scr.renderPass({
                name: 'Render Pass (Layer Empty)',
                colorAttachments: [ 
                    { colorResource: this.layerTexture1 },
                    { colorResource: this.layerTexture2 }
                ],
            }),
        ]

        this.swapPasses[0].executable = true
        this.swapPasses[1].executable = false
        this.swapPasses[2].executable = false
        this.layerBindings[0].executable = true
        this.layerBindings[1].executable = false

        // Add to map
        this.map
        .add2PreProcess(this.flowPass)
        .add2PreProcess(this.simulationPass)
        .add2PreProcess(this.swapPasses[0])
        .add2PreProcess(this.swapPasses[1])
        .add2PreProcess(this.swapPasses[2])
        .add2RenderPass(this.layerPipeline, this.layerBindings[0])
        .add2RenderPass(this.layerPipeline, this.layerBindings[1])
        // .add2RenderPass(this.showPipeline, this.showBinding)

        this.map.on('movestart', () => this.idle())
        this.map.on('move', () => this.idle())
        this.map.on('moveend', () => this.restart())
        this.map.on('dragstart', () => this.idle())
        this.map.on('drag', () => this.idle())
        this.map.on('dragend', () => this.restart())
        this.map.on('zoomstart', () => this.idle())
        this.map.on('zoom', () => this.idle())
        this.map.on('zoomend', () => this.restart())
        this.map.on('rotatestart', () => this.idle())
        this.map.on('rotate', () => this.idle())
        this.map.on('rotateend', () => this.restart())
        this.map.on('pitchstart', () => this.idle())
        this.map.on('pitch', () => this.idle())
        this.map.on('pitchend', () => this.restart())

        this.isInitialized = true
    }

    render(gl, matrix) {
        this.map.triggerRepaint()

        if (!this.isInitialized) return

        if (this.isHided) {

            this.makeVisibility(false); return
        } else this.makeVisibility(true)

        if (this.isIdling) {
            
            this.swapPasses[0].executable = false
            this.swapPasses[1].executable = false
            this.swapPasses[2].executable = true
            this.layerBindings[0].executable = false
            this.layerBindings[1].executable = false
        }
        else {

            if (this.preheat-- > 0) return

            this.randomSeed.n = Math.random()

            if (!this.swapPointer % 2) {

                this.swapPasses[0].executable = false
                this.swapPasses[1].executable = true
                this.layerBindings[0].executable = false
                this.layerBindings[1].executable = true
    
            } else {
                this.swapPasses[0].executable = true
                this.swapPasses[1].executable = false
                this.layerBindings[0].executable = true
                this.layerBindings[1].executable = false
            }
            this.swapPasses[2].executable = false
            this.swapPointer = (this.swapPointer + 1) % 2
        }
    }

    idle() {

        this.isIdling = true
    }

    restart() {

        this.preheat = 10
        this.isIdling = false
        this.swapPasses[2].executable = false
        this.particleRef.value = this.randomFillData
    }

    show() {
        this.isHided = false
    }

    hide() {

        this.isHided = true
    }

    makeVisibility(visibility) {

        if (!visibility) {
            this.showPipeline.executable = false
    
            this.flowPass.executable = false
            this.swapPasses[0].executable = false
            this.swapPasses[1].executable = false
            this.swapPasses[2].executable = false
            this.simulationPass.executable = false
            this.layerBindings[0].executable = false
            this.layerBindings[1].executable = false
        } else {

            this.showPipeline.executable = true
                
            this.flowPass.executable = true
            this.simulationPass.executable = true
        }
    }

    updateMaxSpeed(maxSpeed) {

        this.maxSpeed.n = maxSpeed > this.maxSpeed.n ? maxSpeed : this.maxSpeed.n
    }
}
