import * as scr from '../../src/scratch.js'

scr.StartDash().then(_ => main(document.getElementById('GPUFrame')))

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
        name: 'Binding (Hard-coded triangle)',
        range: () => [ 3 ] // Draw 3 points of a triangle (1 instance as default)
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
        colorAttachments: [ { colorResource: screen, clearValue: [ 0., 0., 0., 1. ] } ]
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
