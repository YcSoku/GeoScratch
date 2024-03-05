
import mapboxgl, { Map } from 'mapbox-gl'
import Stats from 'https://threejs.org/examples/jsm/libs/stats.module.js'
import * as Scratch from '../../scratch.js'

const device = Scratch.getDevice()

/**
 * @type {{[uuid: string]: Scratch.Binding}}
 */
const bindings = {}

let triangle
/**
 * @type {Scratch.Canvas}
 */
let screen
/**
 * @type {Scratch.Texture}
 */
let depthTexture
/**
 * @type {Scratch.RenderPipeline}
 */
let renderPipeline
/**
 * @type {Scratch.RenderPass}
 */
let renderPass

let up = new Scratch.Vector3(0.0, 1.0, 0.0);
let target = new Scratch.Vector3(0.0, 0.0, 0.0);
let cameraPos = new Scratch.Vector3(0.0, 0.0, 1200.0);
let lightPos = new Scratch.Vector3(-600.0, 0.0, 0.0).applyMatrix4(new Scratch.Matrix4().makeRotationZ(Scratch.DEG2RAD * -23.0)).toArray();

// Matrix
let viewMatrix = new Scratch.Matrix4();
let modelMatrix = new Scratch.Matrix4();
let normalMatrix = new Scratch.Matrix4();
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
        // stats
        stats = new Stats();
        map.getContainer().appendChild(stats.dom);
        animate();

        map.addLayer({
            id: 'custom_layer',
            type: 'custom',
            renderingMode: '3d',
            map: null,
            onAdd: function (map, mbxContext) {

                this.map = map

                // instantiate threebox
                window.tb = new Threebox(
                    map,
                    mbxContext,
                    {
                        defaultLights: true,
                        enableSelectingObjects: true
                    }
                );

                const {mapCamera, world} = demo_3dtiles(map, tb, makeBinding);
                this.mapCamera = mapCamera
                this.tiles = world

                ///////////////////////////
                ///////////////////////////
                ///////////////////////////
                const gpuCanvas = document.getElementById('WebGPUFrame')
                screen = Scratch.Canvas.create({
                    canvas: gpuCanvas,
                    alphaMode: 'premultiplied'
                })
                depthTexture = Scratch.Texture.create({
                    name: 'Texture (depth)',
                    format: 'depth24plus',
                    resource: { size: () => [screen.context.canvas.width, screen.context.canvas.height] }
                })
                screen.addScreenDependentTexture(depthTexture)

                // // Data prepare
                // const vs = new Float32Array(6)
                // const vertices = Scratch.aRef(vs, 'Vertex Buffer Reference')
                // vertices.value = new Float32Array([-0.5, -0.5, 0.0, 0.5, 0.5, -0.5])

                // const vertexBuffer = Scratch.VertexBuffer.create({
                //     name: 'Vertex Buffer (Triangle vertices)',
                //     resource: {
                //         arrayRef: vertices,
                //         structure: [
                //             {components: 2},
                //         ]
                //     }
                // })

                // Binding
                triangle = Scratch.Binding.create({
                    name: 'Binding (Triangle)',
                    range: () => [3],
                    uniforms: [
                        {
                            name: 'DynamicUniformBlock',
                            dynamic: true,
                            map: {
                                view: () => viewMatrix.elements,
                                projection: () => projectionMatrix.elements,
                            }
                        }
                    ],
                });

                // Render pipeline
                renderPipeline = Scratch.RenderPipeline.create({
                    name: 'Render pipeline (3DTiles)',
                    shader: Scratch.shaderLoader.load('Shader (3DTiles)', '/shaders/tile.wgsl'),
                    // primitive: {topology: 'triangle-strip'},
                    colorTargetStates: [
                        {
                            format: screen.presentationFormat,
                            blend: Scratch.NormalBlending,
                        }
                    ],
                    depthTest: true,
                });

                // Pass
                renderPass = Scratch.RenderPass.create({
                    name: 'Render Pass (Tile)',
                    colorAttachments: [ { colorResource: screen.getCurrentCanvasTexture()} ],
                    depthStencilAttachment: { depthStencilResource: depthTexture }
                });

                // Director
                const stageName = 'Hello 3DTiles';
                Scratch.director.makeNewStage(stageName).addItem(stageName, renderPass);
            },

            render: function (gl, matrix) {
                // if (this.map) this.map.triggerRepaint()
                tb.update()
                screen.tick()

                projectionMatrix = this.mapCamera.camera.projectionMatrix
                viewMatrix = this.mapCamera.camera.matrixWorldInverse

                const meshes = {
                    array: []
                }
                this.tiles.children.forEach(tile => {
                    getMeshInTile(tile, meshes)
                })

                renderPass.empty()
                meshes.array.forEach(mesh => {
                    bindings[mesh.uuid] && renderPass.add(renderPipeline, bindings[mesh.uuid])
                })

                Scratch.director.show()
            }
        })
    })
}

function getMeshInTile(tile, meshes) {

    tile.children.length && tile.children.forEach(subTile => {
        getMeshInTile(subTile, meshes)
    })

    if (tile.type === 'Mesh') {
        meshes.array.push(tile)
        makeBinding(tile)
    }
}

function makeBinding(mesh) {

    // console.log(mesh)
    const indices = mesh.geometry.index.array
    const positions = mesh.geometry.attributes.position.array
    const uvs = mesh.geometry.attributes.uv.array
    const normals = mesh.geometry.attributes.normal.array
    const imageBitmap = mesh.material.map.source.data

    // if (bindings[mesh.uuid]) {
    //     if (indices.length === bindings[mesh.uuid].range()[0]) {
    //         return 
    //     } else {
    //         bindings[mesh.uuid].destroy()
    //     }
    // }

    // console.log('indices I get: ', indices)

    const vertexBuffer_position = Scratch.VertexBuffer.create({
        resource: {arrayRef: Scratch.aRef(positions), structure: [{components: 3}]}
    })
    const vertexBuffer_uv = Scratch.VertexBuffer.create({
        resource: {arrayRef: Scratch.aRef(uvs), structure: [{components: 2}]}
    })
    const vertexBuffer_normal = Scratch.VertexBuffer.create({
        resource: {arrayRef: Scratch.aRef(normals), structure: [{components: 3}]}
    })
    const indexBuffer = Scratch.IndexBuffer.create({
        resource: {arrayRef: Scratch.aRef(indices)}
    })
    const texture = Scratch.Texture.create({
        resource: {
            imageBitmap: () => {
                return { imageBitmap: imageBitmap }
            },
            dataType: "imageBitmap"
        }
    })

    const lSamplerDesc = {
        name: 'Sampler (linear)',
        bindingType: 'filtering',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    }

    bindings[mesh.uuid] = Scratch.Binding.create({
        name: mesh.uuid,
        range: () => [indices.length],
        uniforms: [
            {
                name: 'DynamicUniformBlock',
                dynamic: true,
                map: {
                    model: () => mesh.matrixWorld.elements,
                    view: () => viewMatrix.elements,
                    projection: () => projectionMatrix.elements,
                }
            }
        ],
        vertices: [
            { buffer: vertexBuffer_position },
            { buffer: vertexBuffer_uv },
            { buffer: vertexBuffer_normal },
        ],
        index: { buffer: indexBuffer },
        samplers: [ lSamplerDesc ],
        textures: [ {texture: texture} ]
    })

    mesh.visible = false
}