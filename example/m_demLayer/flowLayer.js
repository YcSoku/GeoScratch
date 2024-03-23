import * as scr from '../../src/scratch.js'
import { Delaunay } from 'd3-delaunay'
import axios from 'axios'

const flowJsonWorker = new Worker(new URL( './flowJson.worker.js', import.meta.url ), { type: 'module' })
const resourceUrl = [
    '/json/examples/terrain/stations_0.json',
    '/json/examples/terrain/stations_1.json',
    '/json/examples/terrain/stations_2.json',
    '/json/examples/terrain/stations_3.json',
    '/json/examples/terrain/stations_4.json',
    '/json/examples/terrain/stations_5.json',
    '/json/examples/terrain/stations_6.json',
    '/json/examples/terrain/stations_7.json',
    '/json/examples/terrain/stations_8.json',
    '/json/examples/terrain/stations_9.json',
    '/json/examples/terrain/stations_10.json',
    '/json/examples/terrain/stations_11.json',
    '/json/examples/terrain/stations_12.json',
    '/json/examples/terrain/stations_13.json',
    '/json/examples/terrain/stations_14.json',
    '/json/examples/terrain/stations_15.json',
    '/json/examples/terrain/stations_16.json',
    '/json/examples/terrain/stations_17.json',
    '/json/examples/terrain/stations_18.json',
    '/json/examples/terrain/stations_19.json',
    '/json/examples/terrain/stations_20.json',
    '/json/examples/terrain/stations_21.json',
    '/json/examples/terrain/stations_22.json',
    '/json/examples/terrain/stations_23.json',
    '/json/examples/terrain/stations_24.json',
    '/json/examples/terrain/stations_25.json',
    '/json/examples/terrain/stations_26.json',
]

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

    constructor() {

        // Layer
        this.type = 'custom'
        this.map = undefined
        this.id = 'FlowLayer'
        this.renderingMode = '3d'

        // Attributes
        this.preheat = 0
        this.swapPointer = 0
        this.maxSpeed = scr.f32()
        this.randomSeed = scr.f32(Math.random())

        // Compute configuration
        this.blockSizeX = 16
        this.blockSizeY = 16
        this.progress = 0.0
        this.particleNum = 262144
        this.framesPerPhase = 300
        this.currentResourceUrl = 0
        this.maxParticleNum = 262144
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
        this.voronoiNextBinding = undefined

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
        this.nextPrepared = false
        this.isInitialized = false
        this.nextPreparing = false

        // Worker
        this.loadWorker = undefined
    }

    async onAdd(map, gl) {

        this.map = map

        this.addWorker(flowJsonWorker)

        this.extent.reset(120.0437360613468201, 31.1739019522094871, 121.9662324011692220, 32.0840108580467813)

        // Buffer-related resource
        this.storageBuffer_particle = scr.storageBuffer({
            name: 'StorageBuffer (Particle Position & Velocity)',
            resource: { arrayRef: this.particleRef }
        })

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
        // SubPass - 1.1: texture (from) generation
        this.voronoiFromPass = scr.renderPass({
            name: 'Render Pass (Voronoi Flow From)',
            colorAttachments: [ { colorResource: this.flowFromTexture } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        })
        // SubPass - 1.1: texture (to) generation
        this.voronoiToPass = scr.renderPass({
            name: 'Render Pass (Voronoi Flow To)',
            colorAttachments: [ { colorResource: this.flowToTexture } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        })
        await this.addVoronoiBindingSync('/json/examples/terrain/stations_0.json'); this.swapVoronoiBinding()
        await this.addVoronoiBindingSync('/json/examples/terrain/stations_1.json'); this.swapVoronoiBinding()
        this.nextPrepared = true
        this.currentResourceUrl = 1

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
            textures: [
                { texture: this.flowFromTexture, sampleType: 'unfilterable-float' },
                { texture: this.flowToTexture, sampleType: 'unfilterable-float' }
            ],
            storages: [ { buffer: this.storageBuffer_particle } ],
            uniforms: [
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

    async render(gl, matrix) {

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
            this.updateVoronoi()
            // console.log(this.voronoiFromBinding.name, this.voronoiToBinding.name)

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

    async updateVoronoi() {

        if (this.nextPreparing) return
        if (this.progress === 0) {

            this.currentResourceUrl = (this.currentResourceUrl + 1) % resourceUrl.length
            this.addVoronoiBindingAsync(resourceUrl[this.currentResourceUrl])
        }

        this.progress = Math.min(this.progress + 1, this.framesPerPhase - 1)
        if (this.nextPrepared && this.progress === this.framesPerPhase - 1) {

            this.progress = 0
            this.swapVoronoiBinding()
        }
        this.progressRate.n = this.progress / (this.framesPerPhase - 1)
    }
    async addVoronoiBindingSync(url) {
        
        this.nextPreparing = true
        let name = url
        const that = this
        const res = await axios.get(url)
        const { maxSpeed, indices, attributes } = triangulate(res.data.stations)
        this.updateMaxSpeed(maxSpeed)
        this.voronoiNextBinding = makeBinding()

        this.nextPreparing = false
        this.nextPrepared = true

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

    swapVoronoiBinding() {

        let tempBinding = this.voronoiFromBinding
        this.voronoiFromBinding = this.voronoiToBinding
        this.voronoiToBinding = tempBinding

        tempBinding = this.voronoiToBinding
        this.voronoiToBinding = this.voronoiNextBinding
        this.voronoiNextBinding = tempBinding
        this.voronoiNextBinding?.release()
        this.nextPrepared = false
        
        // Update voronoi passes
        this.voronoiToPass.empty()
        this.voronoiFromPass.empty()
        this.voronoiToPass.add(this.voronoiPipeline, this.voronoiToBinding)
        this.voronoiFromPass.add(this.voronoiPipeline, this.voronoiFromBinding)
    }

    addWorker(worker) {

        const that = this
        this.loadWorker = worker
        this.loadWorker.addEventListener('message', event => {

            const { url, maxSpeed, indices, attributes } = event.data
            const name = url
            that.updateMaxSpeed(maxSpeed)
            that.voronoiNextBinding = makeBinding()

            that.nextPreparing = false
            that.nextPrepared = true

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
        })
    }

    addVoronoiBindingAsync(url) {

        this.nextPreparing = true

        flowJsonWorker.postMessage({ url })
    }
}
