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
    data.forEach(station => {
        vertices.push(station.lon)
        vertices.push(station.lat)
    })
    const meshes = new Delaunay(vertices)

    let maxSpeed = 0.0
    const attributes = []
    for (let i = 0; i < meshes.points.length; i += 2) {

        const station = data[Math.floor(i / 2)]
        const x = encodeFloatToDouble(scr.MercatorCoordinate.mercatorXfromLon(meshes.points[i + 0]))
        const y = encodeFloatToDouble(scr.MercatorCoordinate.mercatorYfromLat(meshes.points[i + 1]))

        attributes.push(x[0])
        attributes.push(y[0])
        attributes.push(x[1])
        attributes.push(y[1])
        attributes.push(station.u)
        attributes.push(station.v)

        const speed = Math.sqrt(station.u * station.u + station.v * station.v)
        maxSpeed = speed > maxSpeed ? speed : maxSpeed
    }
    
    return { maxSpeed, indices: meshes.triangles, attributes }
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
        this.maxParticleNum = 262144
        this.progress = 0.0
        this.framesPerPhase = 300
        this.progressRate = scr.f32()
        this.extent = scr.boundingBox2D()
        this.groupSizeX = Math.ceil(Math.sqrt(this.maxParticleNum) / this.blockSizeX)
        this.groupSizeY = Math.ceil(Math.sqrt(this.maxParticleNum) / this.blockSizeY)
        this.randomFillData = new Float32Array(this.maxParticleNum * 4).map(() => Math.random())

        // Buffer-related resource
        this.indexBuffer_voronoi = undefined
        this.vertexBuffer_station = undefined
        this.storageBuffer_particle = undefined
        this.particleRef = scr.aRef(this.randomFillData)

        // Texture-related resource
        this.depthTexture = undefined
        this.layerTexture1 = undefined
        this.layerTexture2 = undefined
        this.flowToTexture = undefined
        this.flowFromTexture = undefined

        // Binding
        this.showBinding = undefined
        this.layerBindings = undefined
        this.particleBinding = undefined
        this.voronoiToBinding = undefined
        this.simulationBinding = undefined
        this.trajectoryBindings = undefined
        this.voronoiFromBinding = undefined

        // Pipeline
        this.showPipeline = undefined
        this.layerPipeline = undefined
        this.voronoiPipeline = undefined
        this.particlePipeline = undefined
        this.trajectoryPipeline = undefined
        this.simulationPipeline = undefined

        // Pass
        this.swapPasses = undefined
        this.voronoiToPass = undefined
        this.simulationPass = undefined
        this.voronoiFromPass = undefined

        // Flag
        this.isHided = false
        this.isIdling = false
        this.showVoronoi = true
        this.isInitialized = false
    }

    async makeVoronoiResource(url) {

        const res = await axios.get(url)
        const { indices, maxSpeed, positions, velocities } = triangulate(res.data.stations)

        this.updateMaxSpeed(maxSpeed)

        const indexBuffer_voronoi = scr.indexBuffer({
            name: 'IndexBuffer (Flow Voronoi)',
            resource: { arrayRef: scr.aRef(new Uint32Array(indices)) }
        })
        const vertexBuffer_pos = scr.vertexBuffer({
            name: 'VertexBuffer (Station Pos)',
            resource: { arrayRef: scr.aRef(new Float32Array(positions)), structure: [ { components: 4 } ] }
        })
        const vertexBuffer_v = scr.vertexBuffer({
            name: 'VertexBuffer (Flow Velocity)',
            resource: { arrayRef: scr.aRef(new Float32Array(velocities)), structure: [ { components: 2 } ] }
        })
        const storageBuffer_particle = scr.storageBuffer({
            name: 'StorageBuffer (Particle Pos)',
            resource: { arrayRef: this.particleRef }
        })
    }

    async onAdd(map, gl) {

        this.map = map

        // const res = await axios.get(this.url)
        // const { maxSpeed, indices, attributes } = triangulate(res.data.stations)
        // this.updateMaxSpeed(maxSpeed)
        // const res1 = await axios.get('/json/examples/terrain/stations_11.json')
        // const { maxSpeed: maxSpeed1, indices: indices1, attributes: attributes1} = triangulate(res1.data.stations)
        // this.updateMaxSpeed(maxSpeed1)
        this.extent.reset(120.0437360613468201, 31.1739019522094871, 121.9662324011692220, 32.0840108580467813)

        // Buffer-related resource
        this.storageBuffer_particle = scr.storageBuffer({
            name: 'StorageBuffer (Particle Position & Velocity)',
            resource: { arrayRef: this.particleRef }
        })
        // this.indexBuffer_voronoi = scr.indexBuffer({
        //     name: 'IndexBuffer (Voronoi Polygon Index)',
        //     resource: { arrayRef: scr.aRef(new Uint32Array(indices)) }
        // })
        // this.vertexBuffer_station = scr.vertexBuffer({
        //     name: 'VertexBuffer (Station Position & Velocity)',
        //     resource: { arrayRef: scr.aRef(new Float32Array(attributes)), structure: [ { components: 4 }, { components: 2 } ] }
        // })
        // this.indexBuffer1_voronoi = scr.indexBuffer({
        //     name: 'IndexBuffer (Voronoi Polygon Index 1)',
        //     resource: { arrayRef: scr.aRef(new Uint32Array(indices1)) }
        // })
        // this.vertexBuffer1_station = scr.vertexBuffer({
        //     name: 'VertexBuffer (Station Position & Velocity 1)',
        //     resource: { arrayRef: scr.aRef(new Float32Array(attributes1)), structure: [ { components: 4 }, { components: 2 } ] }
        // })

        // Texture-related resource
        this.layerTexture1 = this.map.screen.createScreenDependentTexture('Texture (Background 1)')
        this.layerTexture2 = this.map.screen.createScreenDependentTexture('Texture (Background 2)')
        this.depthTexture = this.map.screen.createScreenDependentTexture('Texture (Flow Depth)', 'depth24plus')
        this.flowToTexture = this.map.screen.createScreenDependentTexture('Texture (Velocity To)', 'rg32float')
        this.flowFromTexture = this.map.screen.createScreenDependentTexture('Texture (Velocity From)', 'rg32float')

        // PASS - 1: flow textures (from -> to) generation
        this.voronoiPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Voronoi Flow)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Voronoi)', '/shaders/examples/flow/flowVoronoi.wgsl') },
        })
        this.voronoiFromPass = scr.renderPass({
            name: 'Render Pass (Voronoi Flow From)',
            colorAttachments: [ { colorResource: this.flowFromTexture } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        })
        this.voronoiToPass = scr.renderPass({
            name: 'Render Pass (Voronoi Flow To)',
            colorAttachments: [ { colorResource: this.flowToTexture } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        })
        /* Pass 1.1 */ await this.updateVoronoiPass(0, this.url)
        /* Pass 1.2 */ await this.updateVoronoiPass(1, '/json/examples/terrain/stations_11.json')

        // SubPass - 1.1: texture (from) generation
        // this.voronoiFromBinding = scr.binding({
        //     name: 'Binding (Voronoi Flow From)',
        //     range: () => [ indices.length ],
        //     index: { buffer: this.indexBuffer_voronoi },
        //     vertices: [ { buffer: this.vertexBuffer_station } ],
        //     uniforms: [
        //         {
        //             name: 'staticUniform',
        //             map: {
        //                 extent: this.extent.boundary,
        //             }
        //         }
        //     ],
        //     sharedUniforms: [ { buffer: this.map.dynamicUniformBuffer } ],
        // })
        
        // /* Pass 1.1 */.add(this.voronoiPipeline, this.voronoiFromBinding)

        // SubPass - 1.1: texture (to) generation
        // this.voronoiToBinding = scr.binding({
        //     name: 'Binding (Voronoi Flow To)',
        //     range: () => [ indices1.length ],
        //     index: { buffer: this.indexBuffer1_voronoi },
        //     vertices: [ { buffer: this.vertexBuffer1_station } ],
        //     uniforms: [
        //         {
        //             name: 'staticUniform',
        //             map: {
        //                 extent: this.extent.boundary,
        //             }
        //         }
        //     ],
        //     sharedUniforms: [ { buffer: this.map.dynamicUniformBuffer } ],
        // })
        // /* Pass 1.2 */.add(this.voronoiPipeline, this.voronoiToBinding)

        // PASS - 2: particle position simulation
        this.simulationBinding = scr.binding({
            name: 'Binding (Particle Simulation)',
            range: () => [ this.groupSizeX, this.groupSizeY ],
            textures: [
                { texture: this.flowFromTexture, sampleType: 'unfilterable-float' },
                { texture: this.flowToTexture, sampleType: 'unfilterable-float' }
            ],
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
                        progressRate: this.progressRate,
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
        this.simulationPipeline = scr.computePipeline({
            name: 'Compute Pipeline (Flow Simulation)',
            shader: { module: scr.shaderLoader.load('Shader (Particle Simulation)', '/shaders/examples/flow/simulation.compute.wgsl') },
            constants: { blockSize: 16 },
        })
        this.simulationPass = scr.computePass({
            name: 'Compute Pass (Particle Simulation)',
        })
        /* Pass 2 */.add(this.simulationPipeline, this.simulationBinding)

        // PASS - 3: flow trajectory rendering (particle past trajectory + particle current position)
        // SubPass - 3.1: past trajectory rendering
        this.trajectoryBindings = [
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
        this.trajectoryPipeline = scr.renderPipeline({
            name: 'Rendej pipeline (Background Swap)', 
            shader: { module: scr.shaderLoader.load('Shader (Background Swap)', '/shaders/examples/flow/swap.wgsl') },
            primitive: { topology: 'triangle-strip' },
            depthTest: false
        })
        // SubPass - 3.2: current position rendering
        this.particleBinding = scr.binding({
            name: 'Binding (Particles)',
            range: () => [ 4, this.particleNum ],
            textures: [ { texture: this.flowFromTexture, sampleType: 'unfilterable-float' } ],
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
        this.particlePipeline = scr.renderPipeline({
            name: 'Render Pipeline (Particles)',
            shader: { module: scr.shaderLoader.load('Shader (Particles)', '/shaders/examples/flow/particles.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })
        this.swapPasses = [
            scr.renderPass({
                name: 'Render Pass (Past Trajectory 1)',
                colorAttachments: [ { colorResource: this.layerTexture1 } ],
                depthStencilAttachment: { depthStencilResource: this.depthTexture }
            })
            /* Pass 3.1 */.add(this.trajectoryPipeline, this.trajectoryBindings[0])
            /* Pass 3.2 */.add(this.particlePipeline, this.particleBinding),

            scr.renderPass({
                name: 'Render Pass (Past Trajectory 2)',
                colorAttachments: [ { colorResource: this.layerTexture2 } ],
                depthStencilAttachment: { depthStencilResource: this.depthTexture }
            })
            /* Pass 3.1 */.add(this.trajectoryPipeline, this.trajectoryBindings[1])
            /* Pass 3.2 */.add(this.particlePipeline, this.particleBinding),

            scr.renderPass({
                name: 'Render Pass (Trajectory Empty)',
                colorAttachments: [ 
                    { colorResource: this.layerTexture1 },
                    { colorResource: this.layerTexture2 }
                ],
            }) /* Pass 3.3* Trajectory Clear */,
        ]

        // PASS - 4: flow layer rendering
        this.layerBindings = [
            scr.binding({
                name: 'Binding (Layer Renderig 1)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture1 } ],
            }),
            scr.binding({
                name: 'Binding (Layer Renderig 2)',
                range: () => [ 4 ],
                textures: [ { texture: this.layerTexture2 } ],
            })
        ]
        this.layerPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Layer Rendering)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Layer Rendering)', '/shaders/examples/flow/flowLayer.wgsl') },
            primitive: { topology: 'triangle-strip' },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })

        // PASS - 5*: flow texture showing
        this.showBinding = scr.binding({
            name: 'Binding (Flow Show)',
            range: () => [ 4 ],
            textures: [ { texture: this.flowFromTexture, sampleType: 'unfilterable-float' } ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        extent: this.extent.boundary,
                        maxSpeed: this.maxSpeed
                    }
                },
            ],
        })
        this.showPipeline = scr.renderPipeline({
            name: 'Render Pipeline (Flow Show)',
            shader: { module: scr.shaderLoader.load('Shader (Flow Show)', '/shaders/examples/flow/flowShow.wgsl') },
            primitive: { topology: 'triangle-strip' },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })

        // Execution configuration
        this.swapPasses[0].executable = true
        this.swapPasses[1].executable = false
        this.swapPasses[2].executable = false
        this.layerBindings[0].executable = true
        this.layerBindings[1].executable = false

        // Add to map
        this.map
        .add2PreProcess(this.voronoiFromPass)
        .add2PreProcess(this.voronoiToPass)
        .add2PreProcess(this.simulationPass)
        .add2PreProcess(this.swapPasses[0])
        .add2PreProcess(this.swapPasses[1])
        .add2PreProcess(this.swapPasses[2])
        .add2RenderPass(this.layerPipeline, this.layerBindings[0])
        .add2RenderPass(this.layerPipeline, this.layerBindings[1])
        this.showVoronoi && this.map.add2RenderPass(this.showPipeline, this.showBinding)

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
        if (this.isHided) { this.makeVisibility(false); return } else { this.makeVisibility(true) }

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
            this.progress = (this.progress + 1) % this.framesPerPhase
            this.progressRate.n = this.progress / this.framesPerPhase

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
    
            this.voronoiFromPass.executable = false
            this.voronoiToPass.executable = false
            this.swapPasses[0].executable = false
            this.swapPasses[1].executable = false
            this.swapPasses[2].executable = false
            this.simulationPass.executable = false
            this.layerBindings[0].executable = false
            this.layerBindings[1].executable = false
        } else {

            this.showPipeline.executable = true
                
            this.voronoiFromPass.executable = true
            this.voronoiToPass.executable = true
            this.simulationPass.executable = true
        }
    }

    updateMaxSpeed(maxSpeed) {

        this.maxSpeed.n = maxSpeed > this.maxSpeed.n ? maxSpeed : this.maxSpeed.n
    }

    async updateVoronoiPass(index, url) {
        
        const that = this
        const name = index ? 'To' : 'From'

        // Reset binding
        const binding = index ? this.voronoiToBinding : this.voronoiFromBinding
        binding?.release()

        const res = await axios.get(url)
        const { maxSpeed, indices, attributes } = triangulate(res.data.stations)
        this.updateMaxSpeed(maxSpeed)
        if (index) {

            this.voronoiToPass.empty()
            this.voronoiToBinding = makeBinding()
            this.voronoiToPass.add(this.voronoiPipeline, this.voronoiToBinding)
        } else {

            this.voronoiFromPass.empty()
            this.voronoiFromBinding = makeBinding()
            this.voronoiFromPass.add(this.voronoiPipeline, this.voronoiFromBinding)
        }

        function makeBinding() {
            
            return scr.binding({
                name: `Binding (Voronoi Flow ${name})`,
                range: () => [ indices.length ],
                index: {
                    buffer: scr.indexBuffer({
                        name: `IndexBuffer (Voronoi Polygon Index (${name}))`,
                        resource: { arrayRef: scr.aRef(new Uint32Array(indices)) }
                    })
                },
                vertices: [ {
                    buffer: scr.vertexBuffer({
                        name: `VertexBuffer (Station Position & Velocity (${name}))`,
                        resource: { arrayRef: scr.aRef(new Float32Array(attributes)), structure: [ { components: 4 }, { components: 2 } ] }
                    })
                } ],
                uniforms: [
                    {
                        name: 'staticUniform',
                        map: {
                            extent: that.extent.boundary,
                        }
                    }
                ],
                sharedUniforms: [ { buffer: that.map.dynamicUniformBuffer } ],
            })
        }
    }
}
