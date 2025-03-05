import * as scr from '../../src/scratch'
import { Vec3, Mat4, vec3, mat4 } from 'wgpu-matrix'
const triangle = function (canvas: HTMLCanvasElement) {

    const screen = scr.screen({ canvas })

    const shaderCode = `
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
    `

    function init() {

        // Triangle Binding
        const tBinding = scr.binding({
            range: () => [3] // Draw 3 points of a triangle (1 instance as default)
        })

        // Triangle Pipeline
        const tPipeline = scr.renderPipeline({
            shader: {
                module: scr.shader({ name: '1', codeFunc: () => shaderCode })
            },
        })

        // Triangle Pass
        const tPass = scr.renderPass({
            // @ts-ignore screen extends texture
            colorAttachments: [{ colorResource: screen }]
        }).add(tPipeline, tBinding)

        // Stage
        scr.director.addStage({
            name: 'HelloTriangle',
            items: [tPass],
        })
    }

    function animate() {

        scr.director.tick()
        requestAnimationFrame(() => animate())
    }

    init()
    animate()
}


const triangleVertexBuffer = function (canvas: HTMLCanvasElement) {
    const shaderCode = `
    struct VertexInput {
        @builtin(vertex_index) vertexIndex: u32,
        @location(0) position: vec2f,
        @location(1) color: vec3f,
        @location(2) size: f32,
    }
    
    struct VertexOutput {
        @builtin(position) position: vec4f,
        @location(0) @interpolate(perspective, center) color: vec3f,
    }
    
    @vertex
    fn vMain(in: VertexInput) -> VertexOutput {
        
        var out: VertexOutput;
        out.position = vec4f(in.position * in.size, 0.0, 1.0);
        out.color = in.color;
        return out;
    }
    
    @fragment
    fn fMain(in: VertexOutput) -> @location(0) vec4f {
    
        return vec4f(in.color, 1.0);
    }
    `

    let frameCount = 0.
    const vertices = [
        //  X,      Y,      R,      G,      B
        -0.5, -0.5, 1.0, 0.0, 0.0,
        0.0, 0.5, 0.0, 1.0, 0.0,
        0.5, -0.5, 0.0, 0.0, 1.0,
    ]
    const vertexRef = scr.aRef(new Float32Array(vertices))
    const instanceSizeRef = scr.aRef(new Float32Array([1.0])) // The ref of an array to control the size of each triangle instance

    function init(canvas: HTMLCanvasElement) {

        // Screen Texture
        const screen = scr.Screen.create({ canvas })

        // Triangle Vertex Buffer
        const tBuffer_vertex = scr.VertexBuffer.create({
            name: 'Vertex Buffer (Vertices)',
            resource: { arrayRef: vertexRef, structure: [{ components: 2/* (X, Y) */ }, { components: 3/* (R, G, B) */ }] }
        })
        const tBuffer_instanceSize = scr.VertexBuffer.create({
            name: 'Vertex Buffer (Instance sizes)',
            resource: { arrayRef: instanceSizeRef, structure: [{ components: 1 }] },
        })

        // Triangle Binding
        const tBinding = scr.Binding.create({
            name: 'Binding (Hard-coded triangle)',
            range: () => [3, 1], // Draw 1 triangle instance
            vertices: [
                { buffer: tBuffer_vertex }, // Shader VertexInput location(0) & location(1)
                { buffer: tBuffer_instanceSize, isInstanced: true }, // Shader VertexInput location(2)
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
            // @ts-ignore screen extends texture
            colorAttachments: [{ colorResource: screen, clearValue: [0., 0., 0., 1.] }]
        }).add(tPipeline, tBinding)

        // Stage
        scr.director.addStage({
            name: 'HelloTriangle',
            items: [tPass],
        })
    }

    function animate() {

        // ArrayRef.value as LEFT value can RETUREN the typedArray it has
        // ArrayRef.value as RIGHT value can REPLACE the typedArray it has (DANGEROUS!)
        instanceSizeRef.value.forEach(
            // ArrayRef.element can SET (with the 2nd arg)  the element at i
            // ArrayRef.element can GET (without the 2nd arg) the element at i
            (_, i) => instanceSizeRef.element(i, Math.cos(++frameCount * 0.02))
        )

        scr.director.tick()
        requestAnimationFrame(() => animate())
    }

    async function main(canvas: HTMLCanvasElement) {

        init(canvas)
        animate()
    }

    main(canvas)

}


export default () => {
    
    const canvas = document.getElementById('GPUFrame') as HTMLCanvasElement
    triangleVertexBuffer(canvas)
}