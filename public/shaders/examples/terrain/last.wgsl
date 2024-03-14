struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(perspective, center) texcoords: vec2f,
};

// Texture bindings
@group(0) @binding(0) var lsampler: sampler;
@group(0) @binding(1) var srcTexture: texture_2d<f32>;

@vertex
fn vMain(vsInput: VertexInput) -> VertexOutput {

    let vertices = array<vec2f, 4>(
        vec2f(-1.0, -1.0),
        vec2f(-1.0, 1.0),
        vec2f(1.0, -1.0),
        vec2f(1.0, 1.0)
    );

    let uvs = array<vec2f, 4>(
        vec2f(0.0, 0.0),
        vec2f(0.0, 1.0),
        vec2f(1.0, 0.0),
        vec2f(1.0, 1.0)
    );

    let position = vertices[vsInput.vertexIndex];
    let uv = uvs[vsInput.vertexIndex];

    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.texcoords = vec2f(uv.x, 1.0 - uv.y);
    return output;
}

fn toneMapACES(color: vec3f) -> vec3f {
    let a = 2.51;
    let b = 0.03;
    let c = 2.43;
    let d = 0.59;
    let e = 0.14;

    return clamp((color * (a * color + b)) / (color * (c * color + d) + e), vec3f(0.0), vec3f(1.0));
}

fn gammaCorrect(color: vec3f, gamma: f32) -> vec3f {
    return pow(color, vec3f(1.0 / gamma));
}

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {

    let offsets = array<vec2f, 9>(
        vec2f(-1.0, 1.0), vec2f(0.0, 1.0), vec2f(1.0, 1.0),
        vec2f(-1.0, 0.0), vec2f(0.0, 0.0), vec2f(1.0, 0.0),
        vec2f(-1.0, -1.0), vec2f(0.0, -1.0), vec2f(1.0, -1.0),
    );

    let kernel = array<f32, 9>(
        0.0, 0.0, 0.0,
        -1.0, 1.0, 0.0,
        0.0, 0.0, 0.0,
    );

    let dim = vec2f(textureDimensions(srcTexture, 0).xy);
    let color = textureSample(srcTexture, lsampler, fsInput.texcoords);
    // let sum = color
    //  - 1.0 * textureSample(srcTexture, lsampler, fsInput.texcoords + vec2f(-1.0, 0.0) / dim);

    // let shapen_amount = 0.25;
    // let outColor = (sum * shapen_amount) + color;

    return color;
    // return outColor;
    // return vec4f(1.0);

    // let color = textureSample(srcTexture, lsampler, fsInput.texcoords);
    // return vec4f(toneMapACES(color.rgb), color.a);
    // return color;
}