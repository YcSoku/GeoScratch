import * as scr from '../../src/scratch.js'

scr.StartDash().then(() => main(document.getElementById('GPUFrame')))

const main = function (canvas) {

    // Screen canvas
    /**
     * @type { scr.Screen }
     */
    const screen = scr.screen({ canvas })

    // Scene parameters
    let timeStep = scr.f32(0.)
    let up = scr.vec3f(0., 1., 0.)
    let target = scr.vec3f(0., 0., 0.)
    let cameraPos = scr.vec3f(0., 0., 1200.)
    let lightPos = scr.vec3f(-600., 0., 0.).transformFromMat4(scr.Mat4f.rotationZ(scr.utils.degToRad(-23.)))

    // Earth
    let diam = 800.
    let radius = scr.f32(diam / 2.)
    let rLink = scr.f32(radius.data - 100.)

    // Linking Nodes
    let maxParticleCount = 100
    let nodeInLink = scr.f32(20)
    let particleCount = maxParticleCount
    let minDistance = scr.f32(rLink.data * 2.0)
    let maxConnections = scr.u32(maxParticleCount / 2)

    // Global matrix
    let viewMatrix = scr.mat4f()
    let modelMatrix = scr.mat4f()
    let normalMatrix = scr.mat4f()
    let projectionMatrix = scr.mat4f()

    // Global arrayRef
    /**
     * @type {scr.ArrayRef}
     */
    let linkIndirect
    /**
     * @type {scr.ArrayRef}
     */
    let connetionNums

    // Global sampler
    /**
     * @type { scr.Sampler }
     */
    const lSampler = scr.sampler({
        name: 'Sampler (Linear)',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    })

    const initEarth = function () {

        // Buffer-related resource
        const { indices, vertices, normals, uvs } = scr.sphere(radius.data, 64, 32)
        const vertexBuffer_sphere_index = scr.vertexBuffer({
            name: 'Vertex Buffer (Sphere index)',
            resource: { arrayRef: scr.aRef(new Uint32Array(indices)), structure: [ { components: 1 } ] }
        })
        const storageBuffer_sphere_position = scr.storageBuffer({
            name: 'Storage Buffer (Sphere position)',
            resource: { arrayRef: scr.aRef(new Float32Array(vertices)) }
        })
        const storageBuffer_sphere_normal = scr.storageBuffer({
            name: 'Storage Buffer (Sphere normal)',
            resource: { arrayRef: scr.aRef(new Float32Array(normals)) }
        })
        const storageBuffer_sphere_uv = scr.storageBuffer({
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
        const landWater = scr.binding({
            name: 'Binding (Land and Water)',
            range: () => [ indices.length ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: projectionMatrix.state,
                        view: viewMatrix.state,
                        model: modelMatrix.state,
                        normal: normalMatrix.state,
                        deleta: timeStep.state,
                    }
                },
                {
                    name: 'staticUniform',
                    map: {
                        radius: radius.state,
                        alphaTest: scr.asF32(0.3),
                        opacity: scr.asF32(1.),
                    }
                },
                {
                    name: 'light',
                    map: {
                        position: lightPos.state,
                        color: scr.asVec3f(1.),
                        intensity: scr.asF32(6.),
                        viewPos: cameraPos.state,
                    }
                },
                {
                    name: 'material',
                    map: {
                        ambient: scr.asVec3f(0.4),
                        diffuse: scr.asVec3f(1.),
                        specular: scr.asVec3f(1.),
                        shininess: scr.asF32(16.),
                        emissive: scr.asF32(1.),
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
        const cloud = scr.binding({
            name: 'Binding (Cloud)',
            range: () => [ indices.length ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: projectionMatrix.state,
                        view: viewMatrix.state,
                        model: modelMatrix.state,
                        normal: normalMatrix.state,
                        delta: timeStep.state,
                    }
                },
                {
                    name: 'staticUniform',
                    map: {
                        radius: radius.state,
                        alphaTest: scr.asF32(0.3),
                        opacity: scr.asF32(0.6),
                    }
                },
                {
                    name: 'light',
                    map: {
                        position: lightPos.state,
                        color: scr.asVec3f(1.),
                        intensity: scr.asF32(6.),
                        viewPos: cameraPos.state,
                    }
                },
                {
                    name: 'material',
                    map: {
                        ambient: scr.vec3f(0.8).state,
                        diffuse: scr.vec3f(1.).state,
                        specular: scr.vec3f(1.).state,
                        shininess: scr.asF32(16.),
                        emissive: scr.asF32(1.),
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
        const landPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth land)', '/shaders/land.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })
        // Pipeline: Water
        const waterPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth water)', '/shaders/water.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending } ],
        })
        // Pipeline: Cloud
        const cloudPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (GawEarth cloud)', '/shaders/cloud.wgsl') },
            colorTargetStates: [ { blend: scr.AdditiveBlending } ],
        })

        return {
            land: [ landPipeline, landWater ], water: [ waterPipeline, landWater ], cloud: [ cloudPipeline, cloud ]
        }
    }

    const initLinks = function () {

        // Buffer-related resource of particles
        const pPositions = new Float32Array(maxParticleCount * 3)
        const pVelocities = new Float32Array(maxParticleCount * 3)
        const palette = [ 250. / 255., 250. / 255., 210. / 250., 1. ]
        const pColors = new Float32Array(maxParticleCount * 4).map((_, index) => palette[index % 4])

        for (let i = 0; i < maxParticleCount; i++) {
            const v = scr.vec3f(Math.random() * 2. - 1., Math.random() * 2. - 1., Math.random() * 2. - 1.).normalize().scale(rLink)
        
            pPositions[i * 3 + 0] = v.x
            pPositions[i * 3 + 1] = v.y
            pPositions[i * 3 + 2] = v.z
            pVelocities[i * 3 + 0] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
            pVelocities[i * 3 + 1] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
            pVelocities[i * 3 + 2] = scr.randomNonZeroBetweenMinusOneAndOne(0.3)
        }
        const storageBuffer_particle_velocity = scr.storageBuffer({
            name: 'Storage Buffer (Particle velocity)',
            resource: { arrayRef: scr.aRef(pVelocities) }
        })
        const vertexBuffer_particle_position = scr.vertexBuffer({
            name: 'Vertex Buffer (Particle position)',
            randomAccessible: true,
            resource: { arrayRef: scr.aRef(pPositions), structure: [ { components: 3 } ] }
        })
        const vertexBuffer_particle_color = scr.vertexBuffer({
            name: 'Vertex Buffer (Particle color)',
            resource: { arrayRef: scr.aRef(pColors), structure: [ { components: 4 } ] }
        })

        // Buffer-related resource of links
        const linkIndices = scr.aRef(new Uint32Array(maxParticleCount * maxParticleCount * 2).fill(0))
        for (let i = 0, numConnected = 0; i < maxParticleCount; ++i) {
            for (let j = i + 1; j < maxConnections.data; ++j) {
                linkIndices.element(numConnected++, i)
                linkIndices.element(numConnected++, j)
            }
        }
        const storageBuffer_link_index = scr.storageBuffer({
            name: 'Storage Buffer (Link)',
            resource: { arrayRef: linkIndices }
        })
        
        connetionNums = scr.aRef(new Uint32Array(maxParticleCount).fill(0))
        const storageBuffer_connection_nums = scr.storageBuffer({
            name: 'Storage Buffer (Connection num)',
            resource: { arrayRef: connetionNums }
        })

        linkIndirect = scr.aRef(new Uint32Array([nodeInLink.data, 0, 0, 0]))
        const indirectBuffer_link = scr.indirectBuffer({
            name: 'Storage Buffer (Indirect)',
            randomAccessible: true,
            resource: { arrayRef: linkIndirect }
        })

        // Binding: Particles
        const particles = scr.binding({
            range: () => [ 4, particleCount ],
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: projectionMatrix.state,
                        view: viewMatrix.state,
                        viewPort: scr.asVec2f(screen.width, screen.height),
                    },
                },
                {
                    name: 'staticUniform',
                    map: {
                        size: scr.asF32(5.),
                    },
                },
            ],
            vertices: [
                { buffer: vertexBuffer_particle_position, isInstanced: true },
                { buffer: vertexBuffer_particle_color, isInstanced: true }
            ],
        })

        // Binding: Particle simulator
        const particleSimulator = scr.binding({
            range: () => [ 1, 1 ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        rLink: rLink.state,
                        groupSize: scr.asVec2u(1),
                        angle: scr.asF32(0.01),
                    }
                }
            ],
            storages: [
                { buffer: storageBuffer_particle_velocity },
                { buffer: vertexBuffer_particle_position, writable: true },
            ]
        })

        // Binding: Links
        const links = scr.binding({
            uniforms: [
                {
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        projection: projectionMatrix.state,
                        view: viewMatrix.state,
                    },
                },
                {
                    name: 'staticUniform',
                    map: {
                        minDistance: minDistance.state,
                        cardinalColor: scr.asVec3f(175. / 255., 65. / 255., 5. / 255.),
                        evenColor: scr.asVec3f(80. / 255., 190. / 255., 1.),
                        rLink: rLink.state,
                        maxNodeIndex: nodeInLink.add(-1.).state,
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
        const linkIndexer = scr.binding({
            range: () => [ 1, 1 ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        minDistance: minDistance.state,
                        maxConnection: maxConnections.state,
                        groupSize: scr.asVec2u(1),
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
        const particlePipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (Earth core particel)', '/shaders/point.wgsl') },
            colorTargetStates: [ { blend: scr.NormalBlending} ],
            primitive: { topology: 'triangle-strip' },
            depthTest: false,
        })
        // Pipeline: Link
        const linkPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (Earth core link)', '/shaders/link.wgsl') },
            primitive: { topology: 'line-strip' },
            depthTest: false,
        })
        // Pipeline: Simulation
        const simulationPipeline = scr.computePipeline({
            shader: { module: scr.shaderLoader.load('Shader (Particle simulation)', '/shaders/particle.compute.wgsl') },
            constants: { blockSize: 10 },
        })
        // Pipeline: Indexing
        const indexingPipeline = scr.computePipeline({
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

        // Pass: Blooming postprocess
        const bloomPass = scr.BloomPass.create({
            threshold: 0.0,
            strength: 0.4,
            blurCount: 5,
            inputColorAttachment: sceneTexture
        })
        // Pass：FXAA postprocess
        const fxaaPass = scr.FXAAPass.create({
            threshold: 0.0312,
            searchStep: 10,
            inputColorAttachment: bloomPass.getOutputAttachment()
        })
        screen.addScreenDependentElement(bloomPass).addScreenDependentElement(fxaaPass)
        // Pass: Scene computation
        const computePass_scene = scr.computePass({
            name: 'Compute Pass (GAW Compute)',
        })
        // Pass: Scene rendering
        const renderPass_scene = scr.renderPass({
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
        const output = scr.binding({
            name: 'Binding (Output)',
            range: () => [ 4 ],
            samplers: [ { sampler: lSampler } ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        gamma: scr.asF32(1.),
                        density: scr.asF32(6.),
                    }
                }
            ],
            textures: [ { texture: prePass.getOutputAttachment() } ],
        })

        // Pipeline: Output
        const outputPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (Last)', '/shaders/last.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })

        // Pass: Output rendering
        const renderPass_output = scr.renderPass({
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

        /* Accumulation */      timeStep.add(-0.001)
        /* Connections*/        connetionNums.fill(0)
        /* Link buffer */       linkIndirect.element(1, 0)
        /* View matrix */       viewMatrix.lookAt(cameraPos, target, up)
        /* Model matrix */      modelMatrix.data = scr.Mat4f.rotationX(scr.utils.degToRad(32.)).data
        /* Projection matrix */ projectionMatrix.perspective(45., screen.width / screen.height, 1., 4000.)
        /* Normal matrix */     normalMatrix.data = scr.Mat4f.transposing(scr.Mat4f.inverse(modelMatrix)).data

        scr.director.tick()

        setTimeout(() => requestAnimationFrame( animate ), 1000. / 45. )
    }

    init()
    animate()
}
