import * as Scratch from '../../scratch'

// ---------- Resource-Related Configuration --------- //

// Screen
let screen: Scratch.Screen;

// Scene parameters
let up = new Scratch.Vector3(0.0, 1.0, 0.0);
let target = new Scratch.Vector3(0.0, 0.0, 0.0);
let cameraPos = new Scratch.Vector3(0.0, 0.0, 1200.0);
let lightPos = new Scratch.Vector3(-600.0, 0.0, 0.0).applyMatrix4(new Scratch.Matrix4().makeRotationZ(Scratch.DEG2RAD * -23.0)).toArray();

let timeStep = 0.0;
let diam = 800.0;
let radius = diam / 2.0;
let rLink = radius - 100.0;
let nodesInLink = 5;
let numConnected = 0;
let maxParticleCount = 100;
let minDistance = rLink * 1.2;
let particleCount = maxParticleCount;
let maxConnections = maxParticleCount - 1;

// Global matrix
let viewMatrix = new Scratch.Matrix4();
let modelMatrix = new Scratch.Matrix4();
let normalMatrix = new Scratch.Matrix4();
let projectionMatrix = new Scratch.Matrix4();

// Global arrayRef
let linkIndirect: Scratch.ArrayRef;

// Debug Buffer
let mapBuffer_indirect: Scratch.MapBuffer;

function init(canvas: HTMLCanvasElement) {

    // Make screen
    screen = Scratch.Screen.create({
        canvas: canvas,
    });
    const sceneTexture = screen.createScreenDependentTexture('Texture (Scene)');
    const depthTexture = screen.createScreenDependentTexture('Texture (Depth)', 'depth24plus');
    
    const bloomPass = Scratch.BloomPass.create({
        threshold: 0.0,
        strength: 0.4,
        blurCount: 5,
        inputColorAttachment: sceneTexture
    });

    const fxaaPass = Scratch.FXAAPass.create({
        threshold: 0.0312,
        searchStep: 10,
        inputColorAttachment: bloomPass.getOutputAttachment()
    });
    screen.addScreenDependentTexture(bloomPass.getOutputAttachment()).addScreenDependentTexture(fxaaPass.getOutputAttachment());

    // Earth sphere resource
    const {indices, vertices, normals, uvs} = Scratch.sphere(radius, 64, 32);

    const vertexBuffer_sphere_index = Scratch.VertexBuffer.create({
        name: 'SphereIndex',
        resource: {arrayRef: Scratch.aRef(new Uint32Array(indices)), structure: [{components: 1}]}
    })

    const storageBuffer_sphere_position = Scratch.StorageBuffer.create({
        name: 'SpherePosition',
        resource: { arrayRef: Scratch.aRef(new Float32Array(vertices)) }
    });

    const storageBuffer_sphere_normal = Scratch.StorageBuffer.create({
        name: 'SphereNormal',
        resource: { arrayRef: Scratch.aRef(new Float32Array(normals)) }
    });

    const storageBuffer_sphere_uv = Scratch.StorageBuffer.create({
        name: 'SphereUV',
        resource: { arrayRef: Scratch.aRef(new Float32Array(uvs)) }
    });

    // Particles resource
    const pPositions = new Float32Array(maxParticleCount * 3);
    const pVelocities = new Float32Array(maxParticleCount * 3);
    const palette = [250.0 / 255.0, 250.0 / 255.0, 210.0 / 255.0, 1.0];
    const pColors = new Float32Array(maxParticleCount * 4).map((_, index) => palette[index % 4]);

    for(let i = 0; i < maxParticleCount; i++) {
        let v = new Scratch.Vector3(Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0, Math.random() * 2.0 - 1.0).normalize().multiplyScalar(rLink);

        pPositions[i * 3 + 0] = v.x;
        pPositions[i * 3 + 1] = v.y;
        pPositions[i * 3 + 2] = v.z;
        pVelocities[i * 3 + 0] = Scratch.randomNonZeroBetweenMinusOneAndOne(0.3);
        pVelocities[i * 3 + 1] = Scratch.randomNonZeroBetweenMinusOneAndOne(0.3);
        pVelocities[i * 3 + 2] = Scratch.randomNonZeroBetweenMinusOneAndOne(0.3);
    }
    const storageBuffer_particle_velocity = Scratch.StorageBuffer.create({
        name: 'Storage buffer (particle velocity)',
        resource: {arrayRef: Scratch.aRef(pVelocities)}
    });
    const vertexBuffer_particle_position = Scratch.VertexBuffer.create({
        name: 'Vertex buffer (particle position)',
        randomAccessible: true,
        resource: {arrayRef: Scratch.aRef(pPositions), structure: [{components: 3}]}
    });
    const vertexBuffer_particle_color = Scratch.VertexBuffer.create({
        name: 'Vertex buffer (particle color)',
        resource: {arrayRef: Scratch.aRef(pColors), structure: [{components: 4}]}
    });

    // Links resource
    const linkIndices = Scratch.aRef(new Uint32Array(maxParticleCount * maxParticleCount * 2).fill(0));
    for (let i = 0; i < maxParticleCount; ++i) {
        for (let j = i + 1; j < maxConnections; ++j) {
            linkIndices.elements(numConnected++, i);
            linkIndices.elements(numConnected++, j);
        }
    }
    const storageBuffer_link_index = Scratch.StorageBuffer.create({
        name: 'Storage buffer (link)',
        resource: { arrayRef: linkIndices }
    });

    linkIndirect = Scratch.aRef(new Uint32Array([nodesInLink, 0, 0, 0]))
    const indirectBuffer_link = Scratch.IndirectBuffer.create({
        name: 'Storage buffer (indirect)',
        randomAccessible: true,
        resource: { arrayRef: linkIndirect }
    });
    mapBuffer_indirect = Scratch.MapBuffer.create({
        name: 'Map buffer (indirect)',
        mapTarget: indirectBuffer_link
    });

    // Create texture-related source
    const lSamplerDesc: Scratch.SamplerDescription = {
        name: 'Sampler (linear)',
        bindingType: 'filtering',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    };
    const ldTexture = Scratch.imageLoader.load('Land day', '/images/Earth/earth.jpg' );
    const cdTexture = Scratch.imageLoader.load('Cloud day', '/images/Earth/cloud.jpg');
    const lmTexture = Scratch.imageLoader.load('Land mask', '/images/Earth/mask-land.jpg');
    const cmTexture = Scratch.imageLoader.load('Cloud mask', '/images/Earth/cloud-alpha.jpg');
    const lnTexture = Scratch.imageLoader.load('Land night', '/images/Earth/earth-night.jpg');
    const cnTexture = Scratch.imageLoader.load('Cloud night', '/images/Earth/cloud-night.jpg');
    const lsTexture = Scratch.imageLoader.load('Land specular', '/images/Earth/earth-specular.jpg');
    const leTexture = Scratch.imageLoader.load('Land emission', '/images/Earth/earth-selfillumination.jpg');

    // Land and water
    const land_water = Scratch.Binding.create({
        name: "landWater",
        range: () => [indices.length],
        uniforms: [
            {
                dynamic: true,
                name: 'dynamicUniform',
                map: {
                    projection: () => projectionMatrix.elements,
                    model: () => modelMatrix.elements,
                    view: () => viewMatrix.elements,
                    normal: () => normalMatrix.elements,
                    delta: () => timeStep,
                },
            },
            {
                name: 'staticUniform',
                map: {
                    radius: () => radius,
                    alphaTest: () => 0.3,
                    opacity: () => 1.0,
                },
            },
            {
                name: 'light',
                map: {
                    position: () => lightPos,
                    color: () => [1.0, 1.0, 1.0],
                    intensity: () => 6.0,
                    viewPos: () => cameraPos.toArray(),
                },
            },
            {
                name: 'material',
                map: {
                    ambient: () => [0.4, 0.4, 0.4],
                    diffuse: () => [1.0, 1.0, 1.0],
                    specular: () => [1.0, 1.0, 1.0],
                    shininess: () => 16.0,
                    emissive: () => 1.0,
                },
            }],
        samplers: [ lSamplerDesc ],
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
    });

    // Cloud
    const cloud = Scratch.Binding.create({
        range: () => [indices.length],
        uniforms: [
            {
                dynamic: true,
                name: 'dynamicUniform',
                map: {
                    projection: () => projectionMatrix.elements,
                    view: () => viewMatrix.elements,
                    model: () => modelMatrix.elements,
                    normal: () => normalMatrix.elements,
                    delta: () => timeStep,
                },
            },
            {
                name: 'staticUniform',
                map: {
                    radius: () => radius,
                    alphaTest: () => 0.3,
                    opacity: () => 0.6,
                },
            },
            {
                name: 'light',
                map: {
                    position: () => lightPos,
                    color: () => [1.0, 1.0, 1.0],
                    intensity: () => 6.0,
                    viewPos: () => cameraPos.toArray(),
                },
            },
            {
                name: 'material',
                map: {
                    ambient: () => [0.8, 0.8, 0.8],
                    diffuse: () => [1.0, 1.0, 1.0],
                    specular: () => [1.0, 1.0, 1.0],
                    shininess: () => 16.0,
                    emissive: () => 1.0,
                },
            }
        ],
        samplers: [ lSamplerDesc ],
        textures: [
            { texture: cdTexture },
            { texture: cnTexture },
            { texture: cmTexture }
        ],
        storages: [
            { buffer: storageBuffer_sphere_position },
            { buffer: storageBuffer_sphere_uv },
            { buffer: storageBuffer_sphere_normal },
        ],
        vertices: [ { buffer: vertexBuffer_sphere_index } ],
    });

    // Particles
    const particles = Scratch.Binding.create({
        range: () => [4, particleCount],
        uniforms: [
            {
                dynamic: true,
                name: 'dynamicUniform',
                map: {
                    projection: () => projectionMatrix.elements,
                    view: () => viewMatrix.elements,
                    viewPort: () => [screen.canvas.width, screen.canvas.height],
                },
            },
            {
                name: 'staticUniform',
                map: {
                    size: () => 5.0,
                },
            },
        ],
        vertices: [
            { buffer: vertexBuffer_particle_position, isInstanced: true },
            { buffer: vertexBuffer_particle_color, isInstanced: true }
        ],
    });

    // Links
    const links = Scratch.Binding.create({
        uniforms: [
            {
                dynamic: true,
                name: 'dynamicUniform',
                map: {
                    projection: () => projectionMatrix.elements,
                    view: () => viewMatrix.elements,
                },
            },
            {
                name: 'staticUniform',
                map: {
                    minDistance: () => minDistance,
                    cardinalColor: () => [175.0 / 255.0, 65.0 / 255.0, 5.0 / 255.0],
                    evenColor: () => [80.0 / 255.0, 190.0 / 255.0, 255.0 / 255.0],
                    rLink: () => rLink,
                    maxNodeIndex: () => nodesInLink - 1.0,
                }
            }
        ],
        indirect: { buffer: indirectBuffer_link },
        storages: [
            { buffer: vertexBuffer_particle_position },
            { buffer: storageBuffer_link_index },
        ],
    });

    // Particle simulator
    const particleSimulatior = Scratch.Binding.create({
        range: () => [1, 1],
        uniforms: [
            {
                name: 'staticUniform',
                map: {
                    rLink: () => rLink,
                    groupSize: () => [1.0, 1.0],
                    angle: () => 0.01,
                }
            }
        ],
        storages: [
            { buffer: storageBuffer_particle_velocity },
            { buffer: vertexBuffer_particle_position, writable: true },
        ]
    });

    // Link indexer
    const storageBuffer_connection_nums = Scratch.StorageBuffer.create({
        name: 'Storage buffer (Connection num)',
        resource: { arrayRef: Scratch.aRef(new Uint32Array(maxParticleCount).fill(0)) }
    });
    const linkIndexer = Scratch.Binding.create({
        range: () => [1, 1],
        uniforms: [
            {
                name: 'staticUniform',
                map: {
                    minDistance: () => minDistance,
                    maxConnection: () => maxConnections,
                    groupSize: ()=> [1.0, 1.0],
                }
            }
        ],
        storages: [
            { buffer: vertexBuffer_particle_position },
            { buffer: storageBuffer_link_index, writable: true },
            { buffer: storageBuffer_connection_nums, writable: true },
            { buffer: indirectBuffer_link, writable: true }
        ]
    });

    // Output
    const output = Scratch.Binding.create({
        range: () => [4],
        samplers: [ lSamplerDesc ],
        uniforms: [
            {
                name: 'staticUniform',
                map: {
                    gamma: () => 1.0,
                }
            }
        ],
        textures: [ { texture: fxaaPass.getOutputAttachment()} ],
    });

    // Create pipelines
    const landPipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (gawEarth land)', '/shaders/land.wgsl'),
        colorTargetStates: [ { blend: Scratch.NormalBlending} ],
        asBundle: true
    });

    const waterPipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (GawEarth water)', '/shaders/water.wgsl'),
        colorTargetStates: [ { blend: Scratch.NormalBlending} ],
        asBundle: true
    });

    const cloudPipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (GawEarth cloud)', '/shaders/cloud.wgsl'),
        colorTargetStates: [ { blend: Scratch.AdditiveBlending } ],
        asBundle: true
    });

    const particlePipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (Earth core particel)', '/shaders/point.wgsl'),
        colorTargetStates: [ { blend: Scratch.NormalBlending} ],
        primitive: { topology: 'triangle-strip' },
        depthTest: false,
        asBundle: true
    });

    const linkPipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (Earth core link)', '/shaders/link.wgsl'),
        primitive: { topology: 'line-strip' },
        depthTest: false,
        asBundle: true
    });

    const simulationPipeline = Scratch.ComputePipeline.create({
        shader: Scratch.shaderLoader.load('Shader (Particle simulation)', '/shaders/particle.compute.wgsl'),
        constants: { blockSize: 10 },
    });

    const indexingPipeline = Scratch.ComputePipeline.create({
        shader: Scratch.shaderLoader.load('Shader (Link indexing)', '/shaders/link.compute.wgsl'),
        constants: { blockSize: 10 },
    });

    const outputPipeline = Scratch.RenderPipeline.create({
        shader: Scratch.shaderLoader.load('Shader (Last)', '/shaders/last.wgsl'),
        primitive: { topology: 'triangle-strip' },
    });

    // Create pass
    const computePass_scene = Scratch.ComputePass.create({
        name: 'GAW Compute',
    }).add(simulationPipeline, particleSimulatior).add(indexingPipeline, linkIndexer);

    const renderPass_scene = Scratch.RenderPass.create({
        name: 'GAW Scene',
        colorAttachments: [ { colorResource: sceneTexture } ],
        depthStencilAttachment: { depthStencilResource: depthTexture }
    }).add(landPipeline, land_water).add(linkPipeline, links).add(particlePipeline, particles).add(waterPipeline, land_water).add(cloudPipeline, cloud);

    const renderPass_output = Scratch.RenderPass.create({
        name: 'GAW Output',
        colorAttachments: [ { colorResource: screen.getCurrentCanvasTexture() } ]
    }).add(outputPipeline, output);

    // Rehearsal
    Scratch.director.addNewStage({
        name: 'GAW Earth',
        items: [
            computePass_scene, renderPass_scene,
            bloomPass, fxaaPass,
            renderPass_output
        ]
    });
}

function tickLogic() {

    timeStep -= 0.001;
    projectionMatrix.perspective(45.0, screen.context.canvas.width / screen.context.canvas.height, 1.0, 4000.0);
    viewMatrix.makeTranslation(cameraPos.x, cameraPos.y, cameraPos.z).lookAt(cameraPos, target, up).invert();
    modelMatrix.makeRotationX(Scratch.DEG2RAD * 32.0);
    normalMatrix = modelMatrix.invert().transpose();   

    linkIndirect.elements(1, 0);

    // mapBuffer_indirect.mapping().then((buffer) => {
    //     console.log((new Uint32Array(buffer))[1]);
    // });
}

function tickRender() {

    screen.swap();
    Scratch.director.show();
}

function rendering() {
    
    setTimeout(() => {
        requestAnimationFrame( rendering );
    }, 1000.0 / 60.0 );

    tickLogic();
    tickRender();
}

export {
    init,
    rendering,
}
