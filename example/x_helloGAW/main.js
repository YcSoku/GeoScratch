import { vec3, mat4 } from 'gl-matrix'
import * as scr from '../../src/scratch.js'

scr.StartDash().then(_ => main(document.getElementById('GPUFrame')))

const main = function (canvas) {

    // Screen canvas
    /**
     * @type { scr.Screen }
     */
    const screen = scr.Screen.create({ canvas })

    // Scene parameters
    let timeStep = 0.
    let up = vec3.fromValues(0., 1., 0.)
    let target = vec3.fromValues(0., 0., 0.)
    let cameraPos = vec3.fromValues(0., 0., 1200.)
    let lightPos = vec3.fromValues(-600., 0., 0.)
    vec3.transformMat4(lightPos, lightPos, mat4.fromZRotation(mat4.create(), -23. * scr.DEG2RAD))

    // Earth
    let diam = 800.
    let radius = diam / 2.
    let rLink = radius - 100.

    // Linking Nodes
    let nodeInLink = 5
    let numConnected = 0
    let maxParticleCount = 100
    let minDistance = rLink * 1.2
    let particleCount = maxParticleCount
    let maxConnections = maxParticleCount - 1

    // Global matrix
    let viewMatrix = mat4.create()
    let modelMatrix = mat4.create()
    let normalMatrix = mat4.create()
    let projectionMatrix = mat4.create()

    // Global arrayRef
    /**
     * @type {scr.ArrayRef}
     */
    let linkIndirect

    // Global sampler
    /**
     * @type { scr.Sampler }
     */
    const lSampler = scr.Sampler.create({
        name: 'Sampler (Linear)',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    })

    const initEarth = function () {

        // Buffer-related resource
        const { indices, vertices, normals, uvs } = scr.sphere(radius, 64, 32)
        const vertexBuffer_sphere_index = scr.VertexBuffer.create({
            name: 'Vertex Buffer (Sphere index)',
            resource: { arrayRef: scr.aRef(new Uint32Array(indices)), structure: [ { components: 1 } ] }
        })
        const storageBuffer_sphere_position = scr.StorageBuffer.create({
            name: 'Storage Buffer (Sphere position)',
            resource: { arrayRef: scr.aRef(new Float32Array(vertices)) }
        })
        const storageBuffer_sphere_normal = scr.StorageBuffer.create({
            name: 'Storage Buffer (Sphere normal)',
            resource: { arrayRef: scr.aRef(new Float32Array(normals)) }
        })
        const storageBuffer_sphere_uv = scr.StorageBuffer.create({
            name: 'Storage Buffer (Sphere uv)' ,
            resource: { arrayRef: scr.aRef(new Float32Array(uvs)) }
        })

        // Texture-related resource
        const ldTexture = scr.imageLoader.load('Land day', '/images/Earth/earth.jpg' )
        const cdTexture = scr.imageLoader.load('Cloud day', '/images/Earth/cloud.jpg')
        const lmTexture = scr.imageLoader.load('Land mask', '/images/Earth/mask-land.jpg')
        const cmTexture = scr.imageLoader.load('Cloud mask', '/images/Earth/cloud-alpha.jpg')
        const lnTexture = scr.imageLoader.load('Land night', '/images/Earth/earth-night.jpg')
        const cnTexture = scr.imageLoader.load('Cloud night', '/images/Earth/cloud-night.jpg')
        const lsTexture = scr.imageLoader.load('Land specular', '/images/Earth/earth-specular.jpg')
        const leTexture = scr.imageLoader.load('Land emission', '/images/Earth/earth-selfillumination.jpg')

        // Binding: Land and water
        const landWater = scr.Binding.create({
            name: 'Binding (Land and Water)',
            range: _ => [ indices.length ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: { type: 'mat4x4f', value: _ => projectionMatrix },
                        view: { type: 'mat4x4f', value: _ => viewMatrix },
                        model: { type: 'mat4x4f', value: _ => modelMatrix },
                        normal: { type: 'mat4x4f', value: _ => normalMatrix },
                        deleta: { type: 'f32', value: _ => timeStep },
                    }
                },
                {
                    name: 'staticUniform',
                    map: {
                        radius: { type: 'f32', value: _ => radius },
                        alphaTest: { type: 'f32', value: _ => 0.3 },
                        opacity: { type: 'f32', value: _ => 1. },
                    }
                },
                {
                    name: 'light',
                    map: {
                        position: { type: 'vec3f', value: _ => lightPos },
                        color: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        intensity: { type: 'f32', value: _ => 6.0 },
                        viewPos: { type: 'vec3f', value: _ => cameraPos },
                    }
                },
                {
                    name: 'material',
                    map: {
                        ambient: { type: 'vec3f', value: _ => [ 0.4, 0.4, 0.4 ] },
                        diffuse: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        specular: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        shininess: { type: 'f32', value: _ => 16. },
                        emissive: { type: 'f32', value: _ => 1. },
                    }
                }
            ],
            samplers: [ { sampler: lSampler } ],
            textures: [
                { texture: ldTexture },
                { texture: lnTexture },
                { texture: lsTexture },
                { texture: lmTexture },
                { texture: leTexture },
            ],
            storages: [
                { buffer: storageBuffer_sphere_position },
                { buffer: storageBuffer_sphere_uv },
                { buffer: storageBuffer_sphere_normal },
            ],
            vertices: [ { buffer: vertexBuffer_sphere_index } ],
        })
        // Binding: Cloud
        const cloud = scr.Binding.create({
            name: 'Binding (Cloud)',
            range: _ => [ indices.length ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: { type: 'mat4x4f', value: _ => projectionMatrix },
                        view: { type: 'mat4x4f', value: _ => viewMatrix },
                        model: { type: 'mat4x4f', value: _ => modelMatrix },
                        normal: { type: 'mat4x4f', value: _ => normalMatrix },
                        delta: { type: 'f32', value: _ => timeStep },
                    }
                },
                {
                    name: 'staticUniform',
                    map: {
                        radius: { type: 'f32', value: _ => radius },
                        alphaTest: { type: 'f32', value: _ => 0.3 },
                        opacity: { type: 'f32', value: _ => 0.6 }
                    }
                },
                {
                    name: 'light',
                    map: {
                        position: { type: 'vec3f', value: _ => lightPos },
                        color: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        intensity: { type: 'f32', value: _ => 6. },
                        viewPos: { type: 'vec3f', value: _ => cameraPos },
                    }
                },
                {
                    name: 'material',
                    map: {
                        ambient: { type: 'vec3f', value: _ => [ 0.8, 0.8, 0.8 ] },
                        diffuse: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        specular: { type: 'vec3f', value: _ => [ 1., 1., 1. ] },
                        shininess: { type: 'f32', value: _ => 16.0 },
                        emissive: { type: 'f32', value: _ => 1. },
                    }
                }
            ],
            samplers: [ { sampler: lSampler } ],
            textures: [ 
                { texture: cdTexture },
                { texture: cnTexture },
                { texture: cmTexture },
            ],
            storages: [
                { buffer: storageBuffer_sphere_position },
                { buffer: storageBuffer_sphere_uv },
                { buffer: storageBuffer_sphere_normal },
            ],
            vertices: [ { buffer: vertexBuffer_sphere_index } ],
        })

        // Pipeline: Land
        const landPipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth land)', '/shaders/land.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })
        // Pipeline: Water
        const waterPipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth water)', '/shaders/water.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })
        // Pipeline: Cloud
        const cloudPipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth cloud)', '/shaders/cloud.wgsl') },
            colorTargetStates: [ { blend: scr.AdditiveBlending } ],
        })

        return {
            land: [landPipeline, landWater], water: [waterPipeline, landWater], cloud: [cloudPipeline, cloud]
        }
    }

    const initLinks = function () {

        // Buffer-related resource of particles
        const pPositions = new Float32Array(maxParticleCount * 3)
        const pVelocities = new Float32Array(maxParticleCount * 3)
        const palette = [ 250. / 255., 250. / 255., 210. / 250., 1.0 ]
        const pColors = new Float32Array(maxParticleCount * 4).map((_, index) => palette[index % 4])

        for (let i = 0; i < maxParticleCount; i++) {
            let v = vec3.create()
            vec3.scale(v, vec3.normalize(v, vec3.fromValues(Math.random() * 2. - 1., Math.random() * 2. - 1., Math.random() * 2. - 1.)), rLink)
        
            pPositions[i * 3 + 0] = v[0]
            pPositions[i * 3 + 1] = v[1]
            pPositions[i * 3 + 2] = v[2]
            pVelocities[i * 3 + 0] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
            pVelocities[i * 3 + 1] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
            pVelocities[i * 3 + 2] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
        }
        const storageBuffer_particle_velocity = scr.StorageBuffer.create({
            name: 'Storage Buffer (Particle velocity)',
            resource: { arrayRef: scr.aRef(pVelocities) }
        })
        const vertexBuffer_particle_position = scr.VertexBuffer.create({
            name: 'Vertex Buffer (Particle position)',
            randomAccessible: true,
            resource: { arrayRef: scr.aRef(pPositions), structure: [ { components: 3 } ] }
        })
        const vertexBuffer_particle_color = scr.VertexBuffer.create({
            name: 'Vertex Buffer (Particle color)',
            resource: { arrayRef: scr.aRef(pColors), structure: [ {components: 4} ] }
        })

        // Buffer-related resource of links
        const linkIndices = scr.aRef(new Uint32Array(maxParticleCount * maxParticleCount * 2).fill(0))
        for (let i = 0; i < maxParticleCount; ++i) {
            for (let j = i + 1; j < maxConnections; ++j) {
                linkIndices.element(numConnected++, i)
                linkIndices.element(numConnected++, j)
            }
        }
        const storageBuffer_link_index = scr.StorageBuffer.create({
            name: 'Storage Buffer (Link)',
            resource: { arrayRef: linkIndices }
        })
        
        const storageBuffer_connection_nums = scr.StorageBuffer.create({
            name: 'Storage Buffer (Connection num)',
            resource: { arrayRef: scr.aRef(new Uint32Array(maxParticleCount).fill(0)) }
        })

        linkIndirect = scr.aRef(new Uint32Array([nodeInLink, 0, 0, 0]))
        const indirectBuffer_link = scr.IndirectBuffer.create({
            name: 'Storage Buffer (Indirect)',
            randomAccessible: true,
            resource: { arrayRef: linkIndirect }
        })

        // Binding: Particles
        const particles = scr.Binding.create({
            range: _ => [ 4, particleCount ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: { type: 'mat4x4f', value: _ => projectionMatrix },
                        view: { type: 'mat4x4f', value: _ => viewMatrix },
                        viewPort: { type: 'mat4x4f', value: _ => [ screen.width, screen.height ] },
                    },
                },
                {
                    name: 'staticUniform',
                    map: {
                        size: { type: 'f32', value: _ => 5.0 },
                    },
                },
            ],
            vertices: [
                { buffer: vertexBuffer_particle_position, isInstanced: true },
                { buffer: vertexBuffer_particle_color, isInstanced: true }
            ],
        })

        // Binding: Particle simulator
        const particleSimulator = scr.Binding.create({
            range: _ => [ 1, 1 ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        rLink: { type: 'f32', value: _ => rLink },
                        groupSize: { type: 'vec2u', value: _ => [ 1.0, 1.0 ] },
                        angle: { type: 'f32', value: _ => 0.01 },
                    }
                }
            ],
            storages: [
                { buffer: storageBuffer_particle_velocity },
                { buffer: vertexBuffer_particle_position, writable: true },
            ]
        })

        // Binding: Links
        const links = scr.Binding.create({
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: { type: 'mat4x4f', value: _ => projectionMatrix },
                        view: { type: 'mat4x4f', value: _ => viewMatrix },
                    },
                },
                {
                    name: 'staticUniform',
                    map: {
                        minDistance: { type: 'f32', value: _ => minDistance },
                        cardinalColor: { type: 'vec3f', value: _ => [ 175. / 255., 65. / 255., 5. / 255. ] },
                        evenColor: { type: 'vec3f', value: _ => [ 80. / 255., 190. / 255., 1. ] },
                        rLink: { type: 'f32', value: _ => rLink },
                        maxNodeIndex: { type: 'f32', value: _ => nodeInLink - 1. },
                    }
                }
            ],
            indirect: { buffer: indirectBuffer_link },
            storages: [
                { buffer: vertexBuffer_particle_position },
                { buffer: storageBuffer_link_index },
            ],
        })

        // Binding: Link indexer
        const linkIndexer = scr.Binding.create({
            range: _ => [ 1, 1 ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        minDistance: { type: 'f32', value: _ => minDistance },
                        maxConnection: { type: 'f32', value: _ => maxConnections },
                        groupSize: {type: 'vec2u', value: _ => [ 1.0, 1.0 ] },
                    }
                }
            ],
            storages: [
                { buffer: vertexBuffer_particle_position },
                { buffer: storageBuffer_link_index, writable: true },
                { buffer: storageBuffer_connection_nums, writable: true },
                { buffer: indirectBuffer_link, writable: true }
            ]
        })

        // Pipeline: Particle
        const particlePipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (Earth core particel)', '/shaders/point.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending} ],
            primitive: { topology: 'triangle-strip' },
            depthTest: false,
        })
        // Pipeline: Link
        const linkPipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (Earth core link)', '/shaders/link.wgsl') },
            primitive: { topology: 'line-strip' },
            depthTest: false,
        })
        // Pipeline: Simulation
        const simulationPipeline = scr.ComputePipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (Particle simulation)', '/shaders/particle.compute.wgsl') },
            constants: { blockSize: 10 },
        })
        // Pipeline: Indexing
        const indexingPipeline = scr.ComputePipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (Link indexing)', '/shaders/link.compute.wgsl') },
            constants: { blockSize: 10 },
        })

        return {
            particles: [ particlePipeline, particles ], links: [ linkPipeline, links ],
            simulator: [ simulationPipeline, particleSimulator ], indexer: [ indexingPipeline, linkIndexer ]
        }
    }

    const initPass = function () {

        // Texture-related resource
        const sceneTexture = screen.createScreenDependentTexture('Texture (Scene)')
        const depthTexture = screen.createScreenDependentTexture('Texture (Depth)', 'depth24plus')

        // Pass: Blooming effect
        const bloomPass = scr.BloomPass.create({
            threshold: 0.0,
            strength: 0.4,
            blurCount: 5,
            inputColorAttachment: sceneTexture
        })
        // Pass：FXAA effect
        const fxaaPass = scr.FXAAPass.create({
            threshold: 0.0312,
            searchStep: 10,
            inputColorAttachment: bloomPass.getOutputAttachment()
        })
        screen.addScreenDependentElement(bloomPass).addScreenDependentElement(fxaaPass)
        // Pass: Scene computation
        const computePass_scene = scr.ComputePass.create({
            name: 'Compute Pass (GAW Compute)',
        })
        // Pass: Scene rendering
        const renderPass_scene = scr.RenderPass.create({
            name: 'Render Pass (GAW Scene)',
            colorAttachments: [ { colorResource: sceneTexture } ],
            depthStencilAttachment: { depthStencilResource: depthTexture },
        })

        return {
            bloomPass, fxaaPass,
            computePass_scene, renderPass_scene
        }
    }

    const initOutputPass = function (prePass) {
        
        // Binding: Output
        const output = scr.Binding.create({
            name: 'Binding (Output)',
            range: _ => [ 4 ],
            samplers: [ { sampler: lSampler } ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        gamma: { type: 'f32', value: _ => 1.0 },
                        density: { type: 'f32', value: _ => 6.0 },
                    }
                }
            ],
            textures: [ { texture: prePass.getOutputAttachment() } ],
        })

        // Pipeline: Output
        const outputPipeline = scr.RenderPipeline.create({
            shader: { module: scr.shaderLoader.load('Shader (Last)', '/shaders/last.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })

        // Pass: Output rendering
        const renderPass_output = scr.RenderPass.create({
            name: 'Render Pass (GAW Output)',
            colorAttachments: [ { colorResource: screen } ],
        }).add(outputPipeline, output)

        return renderPass_output
    }

    const init = function () {

        // Earth
        const { land, water, cloud } = initEarth()

        // Particle and link
        const { simulator, indexer, particles, links } = initLinks()

        // Intermediate pass
        const { renderPass_scene, computePass_scene, bloomPass, fxaaPass } = initPass()

        // Output pass
        const outputPass = initOutputPass(fxaaPass)

        // Stage
        scr.director.addStage({
            name: 'HelloGeoAnythingWeb',
            items: [
                /* 1st pass */  computePass_scene.add(...simulator).add(...indexer), 
                /* 2nd pass */  renderPass_scene.add(...land).add(...links).add(...particles).add(...water).add(...cloud),
                /* 3rd pass */  bloomPass,
                /* 4th pass */  fxaaPass,
                /* 5th pass */  outputPass,
            ],
        })
    }

    const animate = function () {

        /* Accumulation */      timeStep -= 0.001
        /* Link buffer */       linkIndirect.element(1, 0)
        /* View matrix */       mat4.lookAt(viewMatrix, cameraPos, target, up)
        /* Model matrix */      mat4.fromXRotation(modelMatrix, 32.0 * scr.DEG2RAD)
        /* Normal matrix */     mat4.transpose(normalMatrix, mat4.invert(normalMatrix, modelMatrix))
        /* Projection matrix */ mat4.perspective(projectionMatrix, 45.0, screen.width / screen.height, 1., 4000.)

        scr.director.tick()

        setTimeout(_ => requestAnimationFrame( animate ), 1000.0 / 45.0 )
    }

    init()
    animate()
}
