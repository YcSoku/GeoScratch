# GeoScratch

`GeoScratch` is a compact 3D graphics library for geographical and cartographical applications, harnessing the power of [WebGPU](https://www.w3.org/TR/webgpu/) for rendering scenes, maps, and globes.  

As a **lower-level** encapsulation of WebGPU, `Scratch` does not try to make its working logic based on 2D/3D structures, such as scene graph, map layer or globe primitive, instead, focusing on GPU resources (resource bindings, pipelines, passes, etc.). In this way, `Scratch` can give full play to the flexibility of pure WebGPU (classic rednering and other parallel computaion tasks), but at the same time avoid the complex inter-resource dependencies of this modern Web Graphics API. 

Specific rendering structures will be implemented in the **geo-application** layer of this libray, and the graphics library with the geo-applications is the so-called `GeoScratch`.

![Image text](https://github.com/YcSoku/GeoScratch/blob/main/DayDream.png)

## Build Examples
Examples of `GeoScratch` is built by [Vite](https://vitejs.dev/). Trying examples provided in this project
requires an installation of [Node.js](https://nodejs.org/en/).

- Install dependencies: `npm install`.

## Usage
The code below shows the way using GeoScratch to render a hard-coded triangle.

``` JavaScript
import * as scr from 'geoscratch'

scr.StartDash().then(_ => main(document.getElementById('WebGPUFrame')))

const shaderCode = `
struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
}

@vertex
fn vMain(input: VertexInput) -> VertexOutput {

    let pos = array<vec2f, 3>(
        vec2f(-0.5, -0.5),
        vec2f(0.0, 0.5),
        vec2f(0.5, -0.5),
    );
    
    var output: VertexOutput;
    output.position = vec4f(pos[input.vertexIndex], 0.0, 1.0);
    return output;
}

@fragment
fn fMain(input: VertexOutput) -> @location(0) vec4f {

    return vec4f(128., 218., 197., 255.) / 255.;
}
`

function init(canvas) {

    // Screen Texture
    const screen = scr.Screen.create({ canvas })

    // Triangle Binding
    const tBinding = scr.Binding.create({ 
        range: () => [ 3 ] // Draw 3 points of a triangle (1 instance as default)
    })

    // Triangle Pipeline
    const tPipeline = scr.RenderPipeline.create({
        shader: {
            module: scr.Shader.create({
                codeFunc: () => shaderCode,
            })
        },
    })

    // Triangle Pass
    const tPass = scr.RenderPass.create({
        colorAttachments: [ { colorResource: screen } ]
    }).add(tPipeline, tBinding)

    // Stage
    scr.director.addStage({
        name: 'HelloTriangle',
        items: [ tPass ],
    })
}

function animate() {

    scr.director.tick()
    requestAnimationFrame(() => animate())
}

function main(canvas) {

    init(canvas)
    animate()
}
```