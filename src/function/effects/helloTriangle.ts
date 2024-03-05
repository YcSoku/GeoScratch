import * as Scratch from '../../scratch';

import {load} from '@loaders.gl/core';
import { Tileset3D } from '@loaders.gl/tiles';
import {Tiles3DLoader} from '@loaders.gl/3d-tiles';
import { GLTFLoader } from '@loaders.gl/gltf';

let screen: Scratch.Canvas;
let frameCount = 0.0;
let vertices: Scratch.ArrayRef;

export function init(canvas: HTMLCanvasElement) {

    // screen = Scratch.Canvas.create({
    //     canvas: canvas,
    // });

    // const sceneTexture = Scratch.Texture.create({
    //     name: 'Scene texture',
    //     format: 'rgba16float',
    //     resource: {
    //         size: () => [screen.canvas.width, screen.canvas.height],
    //     }
    // });

    // const bloomPass = Scratch.BloomPass.create({
    //     threshold: 0.0,
    //     strength: 1.0,
    //     blurCount: 7,
    //     inputColorAttachment: sceneTexture
    // });

    // screen.addScreenDependentTexture(bloomPass.getOutputAttachment())

    // // Data prepare
    // const vs = new Float32Array(6);
    // vertices = Scratch.aRef(vs, 'Vertex Buffer Reference');
    // vertices.value = new Float32Array([-0.5, -0.5, 0.0, 0.5, 0.5, -0.5]);

    // const indices = Scratch.aRef(new Uint32Array([0, 1, 2]), 'Index Buffer Reference');

    // const vertexBuffer = Scratch.VertexBuffer.create({
    //     name: 'Vertex Buffer (Triangle vertices)',
    //     resource: {
    //         arrayRef: vertices,
    //         structure: [
    //             {components: 2},
    //         ]
    //     }
    // });

    // const storageBuffer_vertices = Scratch.StorageBuffer.fromVertexBuffer(vertexBuffer);

    // const indirect = Scratch.aRef(new Uint32Array([3, 1, 0, 0, 0]), 'Indirect Buffer Reference');

    // const indexBuffer = Scratch.IndexBuffer.create({
    //     name: 'Index Buffer (Triangle indices)',
    //     resource: {arrayRef: indices}
    // });

    // const indirectBuffer = Scratch.IndirectBuffer.create({
    //     name: 'Indirect Buffer (Pipeline drawing range)',
    //     resource: {arrayRef: indirect}
    // });

    // // Binding
    // let compute = Scratch.Binding.create({
    //     name: 'Binding (Compute)',
    //     range: () => [1],
    //     uniforms: [
    //         {
    //             name: 'DynamicUniformBlock',
    //             dynamic: true,
    //             map: {
    //                 size: () => Math.sin(frameCount),
    //             }
    //         }
    //     ],
    //     storages: [
    //         {
    //             buffer: storageBuffer_vertices,
    //             writable: true,
    //         }
    //     ]
    // })

    // let triangle = Scratch.Binding.create({
    //     name: 'Binding (Triangle)',
    //     range: () => [3],
    //     uniforms: [
    //         {
    //             name: 'DynamicUniformBlock',
    //             dynamic: true,
    //             map: {
    //                 size: () => Math.sin(frameCount),
    //             }
    //         }
    //     ],
    //     vertices: [
    //         {buffer: vertexBuffer}
    //     ],
    //     // index: {buffer: indexBuffer},
    //     // indirect: {buffer: indirectBuffer}
    // });

    // let output = Scratch.Binding.create({
    //     range: () => [4],
    //     uniforms: [
    //         {
    //             name: 'StaticUniformBlock',
    //             map: {
    //                 gamma: () => 1.0,
    //             }
    //         }
    //     ],
    //     samplers: [
    //         {
    //             name: 'Sampler (linear)',
    //             bindingType: 'filtering',
    //             filterMinMag: ['linear', 'linear'],
    //             addressModeUVW: ['repeat', 'repeat'],
    //         }
    //     ],
    //     textures: [
    //         {
    //             texture: bloomPass.getOutputAttachment(),
    //         }
    //     ],
    // });

    // // Render pipeline
    // let computePipeline = Scratch.ComputePipeline.create({
    //     name: 'Compuye pipeline (vertex simulation)',
    //     shader: Scratch.shaderLoader.load('Shader (Simulation triangle)', '/shaders/triangle.compute.wgsl'),
    //     constants: {}

    // });

    // let pipeline = Scratch.RenderPipeline.create({
    //     name: 'Render pipeline (Hardcoded triangle)',
    //     shader: Scratch.shaderLoader.load('Shader (Hardcoded triangle)', '/shaders/triangle.wgsl'),
    //     colorTargetStates: [
    //         {
    //             format: 'rgba16float',
    //         }
    //     ],
    //     hasDepthTexture: false,
    // });

    // let outputPipeline = Scratch.RenderPipeline.create({
    //     name : 'Render pipeline (Output)',
    //     shader: Scratch.shaderLoader.load('Shader (Hardcoded triangle)', '/shaders/last.wgsl'),
    //     colorTargetStates: [
    //         {
    //             format: screen.presentationFormat,
    //         }
    //     ],
    //     hasDepthTexture: false,
    //     primitive: {topology: 'triangle-strip'}
    // });

    // // Pass
    // let computePass = Scratch.ComputePass.create({
    //     name: 'Compute pass (simulation)',
    // }).add(computePipeline, compute);

    // let pass = Scratch.RenderPass.create({
    //     name: 'Pass (Hello triangle)',
    //     colorAttachments: [ { colorResource: sceneTexture} ]
    // }).add(pipeline, triangle);

    // let outputPass = Scratch.RenderPass.create({
    //     name: 'Pass (Output)',
    //     colorAttachments: [ { colorResource: screen.getCurrentCanvasTexture()} ]
    // }).add(outputPipeline, output);

    // // Director
    // const stageName = 'Hello Triangle';
    // Scratch.director.makeNewStage(stageName).addItem(stageName, pass).addItem(stageName, bloomPass).addItem(stageName, outputPass);
}

function tickLogic() {

    screen.tick();
    
    frameCount += 0.05;
    // let scale = Math.sin(frameCount);
    // vertices.value = new Float32Array([-0.5 * scale, -0.5 * scale, 0.0 * scale, 0.5 * scale, 0.5 * scale, -0.5 * scale]);
}

export async function rendering() {

    // tickLogic();

    // Scratch.director.show();

    // requestAnimationFrame(rendering);

    const tilesetUrl = 'http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524153/tileset.json';
    const tilesetJson = await load(tilesetUrl, Tiles3DLoader);
    const tileset3d = new Tileset3D(tilesetJson, {
        throttleRequests: false,
        loadTiles: true,
        onTileLoad: tile => console.log(tile)
    });
    console.log(tileset3d)
}
