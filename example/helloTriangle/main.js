import * as scr from '../../src/scratch.js'

const shaderCode = `
struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
}

struct VertexOutput {
    @builtin(position) position: vec4f,
}

struct DynamicUniform {
    size: vec2f,
}

// Uniform Binding
@group(0) @binding(0) var<uniform> dynamicUniform: DynamicUniform;

@vertex
fn vMain(input: VertexInput) -> VertexOutput {

    let pos = array<vec2f, 3>(
        vec2f(-1.0, -1.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, -1.0),
    );
    
    var output: VertexOutput;
    output.position = vec4f(pos[input.vertexIndex] * dynamicUniform.size, 0.0, 1.0);
    return output;
}

@fragment
fn fMain(input: VertexOutput) -> @location(0) vec4f {

    return vec4f(0.0, 0.5, 0.5, 1.0);
}
`

let frameCount = 1.0
let sizeFactor = 0.0

async function init() {

    await scr.StartDash()
    const canvas = document.getElementById('GPUFrame')
    const screen = scr.Screen.create({ canvas })

    // Vertex buffer
    // const buffer_vertices = scr.VertexBuffer.create({
    //     name: 'Vertex Buffer (Triangle Demo)'
    // })

    // Triangle Binding
    const tBinding = scr.Binding.create({
        range: () => [3],
        uniforms: [
            {
                name: 'dynamicUniform',
                dynamic: true,
                map: {
                    size: {
                        type: 'vec2f',
                        value: () => [sizeFactor, sizeFactor],
                    }
                }
            },
        ]
    })

    // Triangle Pipeline
    const tPipeline = scr.RenderPipeline.create({
        name: 'Render Pipeline (Triangle)',
        shader: {
            module: scr.Shader.create({
                name: 'Shader (Triangle)',
                codeFunc: () => shaderCode,
            })
        },
    })

    // Triangle Pass
    const tPass = scr.RenderPass.create({
        name: 'Render Pass (Triangle)',
        colorAttachments: [ { colorResource: screen, clearValue: [0.4, 0.4, 0.4, 1.0] } ]
    }).add(tPipeline, tBinding)

    // Stage
    scr.director.addStage({
        name: 'HelloTriangle',
        items: [ tPass ],
    })
}

function render() {

    frameCount ++
    sizeFactor = Math.sin(frameCount * 0.03)

    scr.director.tick()

    requestAnimationFrame(() => {
        render()
    })
}

async function show() {

    await init()

    render()
}

show()
