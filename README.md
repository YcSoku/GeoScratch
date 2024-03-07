# GeoScratch

[![NPM Package][npm]][npm-url]

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

scr.StartDash().then(() => main(document.getElementById('GPUFrame')))

const main = function (canvas) {
    
    const screen = scr.Screen.create({ canvas })
    
    function init() {
    
        // Triangle Binding
        const tBinding = scr.Binding.create({ 
            range: () => [ 3 ] // Draw 3 points of a triangle (1 instance as default)
        })
    
        // Triangle Pipeline
        const tPipeline = scr.RenderPipeline.create({
            shader: {
                module: scr.Shader.create({
                    codeFunc: () => `
                    const pos = array<vec2f, 3>(
                        vec2f(-0.5, -0.5),
                        vec2f(0.0, 0.5),
                        vec2f(0.5, -0.5),
                    );

                    @vertex
                    fn vMain(@builtin(vertex_index) vertexIndex: u32) -> @builtin(position) vec4f {
                    
                        return vec4f(pos[vertexIndex], 0.0, 1.0);
                    }
                    
                    @fragment
                    fn fMain() -> @location(0) vec4f {
                    
                        return vec4f(128., 218., 197., 255.) / 255.;
                    }
                    `,
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

    init()
    animate()
}
```

[npm]: https://img.shields.io/npm/v/geoscratch
[npm-url]: https://www.npmjs.com/package/geoscratch
