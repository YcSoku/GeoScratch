import { vec3, mat4 } from 'gl-matrix'
import * as scr from '../../src/scratch.js'

// Screen
/**
 * @type { scr.Screen }
 */
let screen

// Scene parameters
let up = vec3.fromValues(0., 1., 0.)
let target = vec3.fromValues(0., 0., 0.)
let cameraPos = vec3.fromValues(0., 0., 1200.)
let lightPos = vec3.fromValues(-600., 0., 0.)
lightPos = vec3.transformMat4(lightPos, lightPos, mat4.fromZRotation(mat4.create(), -23. * scr.DEG2RAD))

let timeStep = 0.
let diam = 800.
let radius = diam / 2.
let rLink = radius - 100.
let nodeInLink = 5
let numConnected = 0
let maxParticleCount = 100
let minDistance = rLink * 1.2
let particleCount = maxParticleCount
let maxConnection = maxParticleCount - 1

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

function init() {

    // Screen Texture
    screen = scr.Screen.create({ canvas: document.getElementById('GPUFrame') })
    const sceneTexture = screen.createScreenDependentTexture('Texture (Scene)')
    const depthTexture = screen.createScreenDependentTexture('Texture (Depth)', 'depth24plus')

    const bloomPass = scr.BloomPass.create({
        threshold: 0.0,
        strength: 0.4,
        blurCount: 5,
        inputColorAttachment: sceneTexture
    })

    const fxaaPass = scr.FXAAPass.create({
        threshold: 0.0312,
        searchStep: 10,
        inputColorAttachment: bloomPass.getOutputAttachment()
    })
    screen.addScreenDependentElement(bloomPass).addScreenDependentElement(fxaaPass)

    // Earth sphere resource
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

    // Texturfe-related source
    const lSampler = scr.Sampler.create({
        name: 'Sampler (Linear)',
        bindingType: 'filtering',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    })
    const ldTexture = scr.imageLoader.load('Land day', '/images/Earth/earth.jpg' )
    const cdTexture = scr.imageLoader.load('Cloud day', '/images/Earth/cloud.jpg')
    const lmTexture = scr.imageLoader.load('Land mask', '/images/Earth/mask-land.jpg')
    const cmTexture = scr.imageLoader.load('Cloud mask', '/images/Earth/cloud-alpha.jpg')
    const lnTexture = scr.imageLoader.load('Land night', '/images/Earth/earth-night.jpg')
    const cnTexture = scr.imageLoader.load('Cloud night', '/images/Earth/cloud-night.jpg')
    const lsTexture = scr.imageLoader.load('Land specular', '/images/Earth/earth-specular.jpg')
    const leTexture = scr.imageLoader.load('Land emission', '/images/Earth/earth-selfillumination.jpg')

    // Land and water
    const landWater = scr.Binding.create({
        name: 'Binding (Land and Water)',
        range: () => [ indices.length ],
        uniforms: [
            {
                name: 'dynamicUniform',
                dynamic: true,
                map: {
                    projection: { type: 'mat4x4f', value: () => projectionMatrix },
                    view: { type: 'mat4x4f', value: () => viewMatrix },
                    model: { type: 'mat4x4f', value: () => modelMatrix },
                    normal: { type: 'mat4x4f', value: () => normalMatrix },
                    deleta: { type: 'f32', value: () => timeStep },
                }
            },
            {
                name: 'staticUniform',
                map: {
                    radius: { type: 'f32', value: () => radius },
                    alphaTest: { type: 'f32', value: () => 0.3 },
                    opacity: { type: 'f32', value: () => 1. },
                }
            },
            {
                name: 'light',
                map: {
                    position: { type: 'vec3f', value: () => lightPos },
                    color: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    intensity: { type: 'f32', value: () => 6.0 },
                    viewPos: { type: 'vec3f', value: () => cameraPos },
                }
            },
            {
                name: 'material',
                map: {
                    ambient: { type: 'vec3f', value: () => [ 0.4, 0.4, 0.4 ] },
                    diffuse: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    specular: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    shininess: { type: 'f32', value: () => 16. },
                    emissive: { type: 'f32', value: () => 1. },
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

    // Cloud
    const cloud = scr.Binding.create({
        range: () => [ indices.length ],
        uniforms: [
            {
                name: 'dynamicUniform',
                dynamic: true,
                map: {
                    projection: { type: 'mat4x4f', value: () => projectionMatrix },
                    view: { type: 'mat4x4f', value: () => viewMatrix },
                    model: { type: 'mat4x4f', value: () => modelMatrix },
                    normal: { type: 'mat4x4f', value: () => normalMatrix },
                    delta: { type: 'f32', value: () => timeStep },
                }
            },
            {
                name: 'staticUniform',
                map: {
                    radius: { type: 'f32', value: () => radius },
                    alphaTest: { type: 'f32', value: () => 0.3 },
                    opacity: { type: 'f32', value: () => 0.6 }
                }
            },
            {
                name: 'light',
                map: {
                    position: { type: 'vec3f', value: () => lightPos },
                    color: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    intensity: { type: 'f32', value: () => 6. },
                    viewPos: { type: 'vec3f', value: () => cameraPos },
                }
            },
            {
                name: 'material',
                map: {
                    ambient: { type: 'vec3f', value: () => [ 0.8, 0.8, 0.8 ] },
                    diffuse: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    specular: { type: 'vec3f', value: () => [ 1., 1., 1. ] },
                    shininess: { type: 'f32', value: () => 16.0 },
                    emissive: { type: 'f32', value: () => 1. },
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

    // Output
    const output = scr.Binding.create({
        range: () => [ 4 ],
        samplers: [ { sampler: lSampler } ],
        uniforms: [
            {
                name: 'staticUniform',
                map: {
                    gamma: { type: 'f32', value: () => 1.0 },
                }
            }
        ],
        textures: [ { texture: fxaaPass.getOutputAttachment() } ],
        // textures: [ { texture: sceneTexture } ],
    })

    // Pipeline
    const landPipeline = scr.RenderPipeline.create({
        shader: { module: scr.shaderLoader.load('Shader (gawEarth land)', '/shaders/land.wgsl') },
        colorTargetStates: [ { blend: scr.NormalBlending } ],
        depthTest: true
    })

    const waterPipeline = scr.RenderPipeline.create({
        shader: { module: scr.shaderLoader.load('Shader (GawEarth water)', '/shaders/water.wgsl') },
        colorTargetStates: [ { blend: scr.NormalBlending } ],
        depthTest: true
    })

    const cloudPipeline = scr.RenderPipeline.create({
        shader: { module: scr.shaderLoader.load('Shader (GawEarth cloud)', '/shaders/cloud.wgsl') },
        colorTargetStates: [ { blend: scr.AdditiveBlending } ],
        depthTest: true
    })

    const outputPipeline = scr.RenderPipeline.create({
        shader: { module: scr.shaderLoader.load('Shader (Last)', '/shaders/last.wgsl') },
        primitive: { topology: 'triangle-strip' },
    })

    // Pass
    const renderPass_scene = scr.RenderPass.create({
        name: 'Pass (GAW Scene)',
        colorAttachments: [ { colorResource: sceneTexture } ],
        depthStencilAttachment: { depthStencilResource: depthTexture },
    }).add(landPipeline, landWater).add(waterPipeline, landWater).add(cloudPipeline, cloud)

    const renderPass_output = scr.RenderPass.create({
        name: 'Pass (GAW Output)',
        colorAttachments: [ { colorResource: screen } ],
    }).add(outputPipeline, output)

    // Stage
    scr.director.addStage({
        name: 'HelloGeoAnythingWeb',
        items: [ 
            renderPass_scene,
            bloomPass, fxaaPass,
            renderPass_output,
         ],
    })
}

function animate() {

    timeStep -= 0.001
    projectionMatrix = mat4.perspective(projectionMatrix, 45.0, screen.width / screen.height, 1., 4000.)
    viewMatrix = mat4.lookAt(mat4.create(), cameraPos, target, up)
    modelMatrix = mat4.fromXRotation(modelMatrix, 32.0 * scr.DEG2RAD)
    normalMatrix = mat4.invert(normalMatrix, modelMatrix)
    normalMatrix = mat4.transpose(normalMatrix, normalMatrix)

    scr.director.tick()
    
    setTimeout(() => {
        requestAnimationFrame( animate )
    }, 1000.0 / 60.0 );
}

function main() {

    init()
    animate()
}

scr.StartDash().then(_ => main())
