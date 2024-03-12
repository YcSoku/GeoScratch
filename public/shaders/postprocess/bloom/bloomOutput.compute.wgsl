struct StaticUniformBlock {
    strength: f32,
}

// Uniform bindings
@group(0) @binding(0) var<uniform> staticUniform: StaticUniformBlock;

// Texture bindings
@group(1) @binding(0) var srcTexture: texture_2d<f32>;
@group(1) @binding(1) var blurTexture: texture_2d<f32>;
@group(1) @binding(2) var dstTexture: texture_storage_2d<rgba16float, write>;

// Constants
override blockSize: u32;

fn getColor(uv: vec2i) -> vec4f {

    let srcColor = textureLoad(srcTexture, uv, 0);
    let blurColor = textureLoad(blurTexture, uv, 0);

    // return blurColor;
    return blurColor * staticUniform.strength + srcColor;
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

@compute @workgroup_size(blockSize, blockSize, 1)
fn cMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let color = getColor(vec2i(id.xy));

    textureStore(dstTexture, vec2i(id.xy), color);
}