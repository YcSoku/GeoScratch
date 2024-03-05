
import mapboxgl, { Map } from 'mapbox-gl'
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js'
import * as Scratch from '../../scratch.js'

import {load} from '@loaders.gl/core';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
/**
 * @type {{[uuid: string]: Scratch.Binding}}
 */
let bindings = {}
/**
 * @type {{[uuid: string]: Scratch.Texture}}
 */
let textures = {}
/**
 * @type {Scratch.Screen}
 */
let screen
/**
 * @type {Scratch.Texture}
 */
let depthTexture
/**
 * @type {Scratch.Texture}
 */
let sceneTexture

/**
 * @type {Scratch.Binding}
 */
let output
/**
 * @type {Scratch.RenderPipeline}
 */
let renderPipeline_scene
/**
 * @type {Scratch.RenderPipeline}
 */
let renderPipeline_output

const lSamplerDesc = {
    name: 'Sampler (linear)',
    bindingType: 'filtering',
    filterMinMag: ['linear', 'linear'],
    addressModeUVW: ['clamp-to-edge', 'clamp-to-edge'],
    mipmap: 'linear',
}

/**
 * @type {Scratch.RenderPass}
 */
let renderPass_scene
let renderPass_output
let bloomPass

// Matrix
let viewMatrix = new Scratch.Matrix4();
let projectionMatrix = new Scratch.Matrix4();

export async function viewing() {
    
    mapboxgl.accessToken = 'pk.eyJ1IjoieXNzMTIzeXNzIiwiYSI6ImNsb2g4ZHQwdDFkbm8ybHBsMnBvZW5sbTkifQ.PD87GISFF1WdmfpsVGLasQ';

    let ORIGIN = [121.496140, 25.056555, -20];

    var map = new mapboxgl.Map({
        container: 'map',
        style: 'mapbox://styles/mapbox/light-v9',
        center: ORIGIN,
        zoom: 15.6,
        pitch: 60,
        antialias: true
    });

    window.mapobj = map;

    let stats;
    function animate() {
        requestAnimationFrame(animate);
        stats.update();
    }
    
    map.on('style.load', function () {

        // Stats
        stats = new Stats()
        map.getContainer().appendChild(stats.dom)

        map.addLayer({
            id: 'custom_layer',
            type: 'custom',
            renderingMode: '3d',
            map: null,
            onAdd: async function (map, mbxContext) {

                this.map = map

                // Instantiate threebox
                window.tb = new Threebox(
                    map,
                    mbxContext,
                    {
                        defaultLights: true,
                        enableSelectingObjects: true
                    }
                )

                const {mapCamera, world} = demo_3dtiles(map, tb)
                this.mapCamera = mapCamera
                this.tiles = world


                ///////////////////////////
                ///////////////////////////
                ///////////////////////////
                const gpuCanvas = document.getElementById('WebGPUFrame')
                screen = Scratch.Screen.create({
                    canvas: gpuCanvas,
                })
                depthTexture = Scratch.Texture.create({
                    name: 'Texture (depth)',
                    format: 'depth24plus',
                    resource: { size: () => [ screen.context.canvas.width, screen.context.canvas.height ] }
                })
                sceneTexture = Scratch.Texture.create({
                    name: 'Texture (Scene)',
                    resource: { size: () => [ screen.context.canvas.width, screen.context.canvas.height ] }
                })
                bloomPass = Scratch.BloomPass.create({
                    threshold: 0.6,
                    strength: 0.0,
                    blurCount: 5,
                    inputColorAttachment: sceneTexture
                })
                screen.addScreenDependentTexture(depthTexture).addScreenDependentTexture(sceneTexture)
                .addScreenDependentTexture(bloomPass.getOutputAttachment())

                // Binding
                output = Scratch.Binding.create({
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
                    textures: [ { texture: bloomPass.getOutputAttachment()} ],
                })

                // Render pipeline
                renderPipeline_scene = Scratch.RenderPipeline.create({
                    name: 'Render pipeline (3DTiles)',
                    shader: Scratch.shaderLoader.load('Shader (3DTiles)', '/shaders/tile.wgsl'),
                    colorTargetStates: [
                        {
                            blend: Scratch.NormalBlending,
                        }
                    ],
                })

                renderPipeline_output = Scratch.RenderPipeline.create({
                    shader: Scratch.shaderLoader.load('Shader (Last)', '/shaders/last.wgsl'),
                    primitive: { topology: 'triangle-strip' },
                })

                // Pass
                renderPass_scene = Scratch.RenderPass.create({
                    name: 'Render Pass (Tile)',
                    colorAttachments: [ { colorResource: sceneTexture} ],
                    depthStencilAttachment: { depthStencilResource: depthTexture }
                })
                renderPass_output = Scratch.RenderPass.create({
                    name: 'Render Pass (Output)',
                    colorAttachments: [ { colorResource: screen.getCurrentCanvasTexture() } ]
                }).add(renderPipeline_output, output)

                // Director
                const stageName = 'Hello 3DTiles'
                Scratch.director.makeNewStage(stageName).addItem(stageName, renderPass_scene)
                .addItem(stageName, bloomPass).addItem(stageName, renderPass_output)

                
                const tilesetUrl = 'http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263506362/16/3143415263506362_tileset.json';
                const tilesetJson = await load(tilesetUrl, Tiles3DLoader);
                const contentUrl = tilesetJson.root.contentUrl
                const b3dm = await load(contentUrl, Tiles3DLoader)
                console.log(b3dm)
            },

            render: function (gl, matrix) {

                if (this.map) this.map.triggerRepaint()
                tb.update()

                if (1) {

                    // for(const uuid in bindings) {
                    //     bindings[uuid].release()
                    // }
                    // for (const uuid in textures) {
                    //     textures[uuid].release()
                    // }
                    // bindings = {}
                    // textures = {}
    
                    projectionMatrix = this.mapCamera.camera.projectionMatrix
                    viewMatrix = this.mapCamera.camera.matrixWorldInverse
                    const meshes = {
                        array: []
                    }
                    this.tiles.children.forEach(tile => getMeshInTile(tile, meshes))

                    const processBatch = () => {

                        for (let i = 0; i < 10 && index < meshes.array.length; i++) {
                            if (Scratch.monitor.getMemoryInMB() < 1000.0) {
                                console.log(Scratch.monitor.getMemoryInMB())
                                return
                            }
                    
                            bindings[meshes.array[index].uuid] && bindings[meshes.array[index].uuid].release()
                            deleteArray.push(meshes.array[index++].uuid)
                        }
                    
                        deleteArray.forEach(uuid => {

                            bindings[uuid] && delete bindings[uuid]
                        })
                        deleteArray = []
                    
                        setTimeout(processBatch, 20)
                    }

                    // let index = 0
                    // let deleteArray = []
                    
                    // // 开始处理
                    // processBatch()
    
                    renderPass_scene.empty()
                    meshes.array.forEach(mesh => {
                        bindings[mesh.uuid] && renderPass_scene.add(renderPipeline_scene, bindings[mesh.uuid])
                    })
                    
                    screen.swap()
    
                    Scratch.director.show()

                    // console.log(Scratch.monitor.getMemoryInMB())
                }
            }
        })
    })
}

function getMeshInTile(tile, meshes) {

    if (tile.hasMeshContent && tile.materialVisibility) {
        tile.meshContent.children.forEach(mesh => {
            meshes.array.push(mesh)
            makeBinding(mesh)
        })
    }
    
    tile.children.length && tile.children.forEach(subTile => getMeshInTile(subTile, meshes))
}

function makeBinding(mesh) {

    if (bindings[mesh.uuid]) return

    const indices = mesh.geometry.index.array
    const positions = mesh.geometry.attributes.position.array
    const uvs = mesh.geometry.attributes.uv.array
    const normals = mesh.geometry.attributes.normal.array
    const imageBitmap = mesh.material.map.source

    const vertexBuffer_position = Scratch.VertexBuffer.create({
        resource: { arrayRef: Scratch.aRef(positions), structure: [ {components: 3} ] }
    })
    const vertexBuffer_uv = Scratch.VertexBuffer.create({
        resource: { arrayRef: Scratch.aRef(uvs), structure: [ {components: 2} ] }
    })
    const vertexBuffer_normal = Scratch.VertexBuffer.create({
        resource: { arrayRef: Scratch.aRef(normals), structure: [ {components: 3} ] }
    })
    const indexBuffer = Scratch.IndexBuffer.create({
        resource: { arrayRef: Scratch.aRef(indices) }
    })
    if (!textures[imageBitmap.uuid]) {
        textures[imageBitmap.uuid] = Scratch.Texture.create({
            flipY: false,
            mipMapped: true,
            resource: {
                imageBitmap: () => { return { imageBitmap: imageBitmap.data } },
                dataType: "imageBitmap"
            }
        })
    }

    bindings[mesh.uuid] = Scratch.Binding.create({
        name: mesh.uuid,
        range: () => [ indices.length ],
        uniforms: [
            {
                name: 'dynamicUniform',
                dynamic: true,
                map: {
                    model: () => mesh.matrixWorld.elements,
                    view: () => viewMatrix.elements,
                    projection: () => projectionMatrix.elements,
                }
            }
        ],
        index: { buffer: indexBuffer },
        vertices: [ 
            { buffer: vertexBuffer_position },
            { buffer: vertexBuffer_uv },
            { buffer: vertexBuffer_normal }, 
        ],
        samplers: [ lSamplerDesc ],
        textures: [ { texture: textures[imageBitmap.uuid] } ]
    })
}