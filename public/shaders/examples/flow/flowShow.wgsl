struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(perspective, center) texcoords: vec2f,
};

struct StaticUniformBlock {
    extent: vec4f,
    maxSpeed: f32,
}

// Uniform bindings
@group(0) @binding(0) var<uniform> staticUniform: StaticUniformBlock;

// Texture bindings
@group(1) @binding(0) var srcTexture: texture_2d<f32>;

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

fn uvCorrection(uv: vec2f, dim: vec2f) -> vec2f {

    return clamp(uv, vec2f(0.0), dim - vec2f(1.0));
}

fn linearSampling(texture: texture_2d<f32>, uv: vec2f, dim: vec2f) -> vec4f {

    let tl = textureLoad(texture, vec2i(uv), 0);
    let tr = textureLoad(texture, vec2i(uvCorrection(uv + vec2f(1.0, 0.0), dim).xy), 0);
    let bl = textureLoad(texture, vec2i(uvCorrection(uv + vec2f(0.0, 1.0), dim).xy), 0);
    let br = textureLoad(texture, vec2i(uvCorrection(uv + vec2f(1.0, 1.0), dim).xy), 0);

    let mix_x = fract(uv.x);
    let mix_y = fract(uv.y);
    let top = mix(tl, tr, mix_x);
    let bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

fn colorFromInt(color: u32) -> vec3f {
    
    let b = f32(color & 0xFF) / 255.0;
    let g = f32((color >> 8) & 0xFF) / 255.0;
    let r = f32((color >> 16) & 0xFF) / 255.0;

    return vec3f(r, g, b);
}

fn velocityColor(speed: f32, rampColors: array<u32, 8>) -> vec3f {
    
    // let bottomIndex = floor(speed * 10.0);
    // let topIndex = mix(bottomIndex + 1.0, 7.0, step(6.0, bottomIndex));
    // let interval = mix(1.0, 4.0, step(6.0, bottomIndex));
    let bottomIndex = floor(speed * 8.0);
    let topIndex = ceil(speed * 8.0);
    let interval = speed * 8.0 - bottomIndex;

    let slowColor = colorFromInt(rampColors[u32(bottomIndex)]);
    let fastColor = colorFromInt(rampColors[u32(topIndex)]);

    // return mix(slowColor, fastColor, (speed * 10.0 - f32(bottomIndex)) / interval);
    return mix(slowColor, fastColor, interval);
}

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

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {

    let rampColors0 = array<u32, 8>(
        0x3288bd,
        0x66c2a5,
        0xabdda4,
        0xe6f598,
        0xfee08b,
        0xfdae61,
        0xf46d43,
        0xd53e4f
    );

    let dim = vec2f(textureDimensions(srcTexture, 0).xy);
    let velocity = linearSampling(srcTexture, fsInput.texcoords * dim, dim).rg;
    if (all(velocity == vec2f(0.0))) {
        discard;
    }

    let color = velocityColor(length(velocity) / staticUniform.maxSpeed, rampColors0);
    // return vec4f(color, 0.0, 0.2);
    return vec4f(color, 0.5);
}