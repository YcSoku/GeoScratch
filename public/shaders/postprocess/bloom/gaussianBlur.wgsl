struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(perspective, center) texcoords: vec2f,
};

struct StaticUniformBlock {
    direction: vec2f,
    steps: u32,
    dimension: f32,
    weight: f32,
}

// Uniform bindings
@group(0) @binding(0) var<uniform> staticUniform: StaticUniformBlock;

// Storage bindings
@group(1) @binding(0) var<storage> gaussianKernel: array<f32>;

// Texture bindings
@group(2) @binding(0) var lsampler: sampler;
@group(2) @binding(1) var highlighTexture: texture_2d<f32>;
@group(2) @binding(2) var aforeTexture: texture_2d<f32>;

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
    var uv = uvs[vsInput.vertexIndex];
    uv.y = 1.0 - uv.y;

    var output: VertexOutput;
    output.position = vec4f(position, 0.0, 1.0);
    output.texcoords = uv;
    return output;
}

fn getBlur(uv: vec2f) -> vec4f {

    return  textureSample(aforeTexture, lsampler, uv) + textureSample(highlighTexture, lsampler, uv);
}

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {

    let sigma = 1.0;
    var weightSum = gaussianKernel[0];
    let stepSize = 1.0 / staticUniform.dimension;
    var blurColor = getBlur(fsInput.texcoords).rgb * weightSum;

    for (var i: u32 = 1; i <= staticUniform.steps; i++) {
        let weight = gaussianKernel[i];
        let uvOffset = f32(i) * stepSize * staticUniform.direction;

        let sample1 = getBlur(fsInput.texcoords + uvOffset).rgb;
        let sample2 = getBlur(fsInput.texcoords - uvOffset).rgb;

        weightSum += 2.0 * weight;
        blurColor += (sample1 + sample2) * weight;
    }
    return vec4f(blurColor / weightSum, 1.0) * staticUniform.weight;
}