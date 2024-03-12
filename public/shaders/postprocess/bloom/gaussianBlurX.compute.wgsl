struct StaticUniformBlock {
    steps: u32,
}

// Uniform bindings
@group(0) @binding(0) var<uniform> staticUniform: StaticUniformBlock;

// Storage bindings
@group(1) @binding(0) var<storage> gaussianKernel: array<f32>;

// Texture bindings
@group(2) @binding(0) var highLightTexture: texture_2d<f32>;
@group(2) @binding(1) var srcTexture: texture_2d<f32>;
@group(2) @binding(2) var dstTexture: texture_storage_2d<rgba16float, write>;

// Constants
override blockSize: u32;

fn uvCorrection(uv: vec2f, dim: vec2f) -> vec2f {

    return clamp(uv, vec2f(0.0), dim);
}

fn linearSampling(uv: vec2f, dim: vec2f) -> vec4f {

    let tl = textureLoad(srcTexture, vec2i(uv), 0);
    let tr = textureLoad(srcTexture, vec2i(uvCorrection(uv + vec2f(1.0, 0.0), dim).xy), 0);
    let bl = textureLoad(srcTexture, vec2i(uvCorrection(uv + vec2f(0.0, 1.0), dim).xy), 0);
    let br = textureLoad(srcTexture, vec2i(uvCorrection(uv + vec2f(1.0, 1.0), dim).xy), 0);

    let mix_x = fract(uv.x);
    let mix_y = fract(uv.y);
    let top = mix(tl, tr, mix_x);
    let bottom = mix(bl, br, mix_x);
    return mix(top, bottom, mix_y);
}

fn srcCoording(uv: vec2i) -> vec2f {

    let srcSize = vec2f(textureDimensions(srcTexture, 0).xy);
    let dstSize = vec2f(textureDimensions(dstTexture).xy);

    let dstUV = (vec2f(uv.xy) + 0.5) / dstSize;
    return dstUV * srcSize - 0.5;
}

@compute @workgroup_size(blockSize, blockSize, 1)
fn cMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let srcSize = vec2f(textureDimensions(srcTexture, 0).xy);
    let dstSize = vec2f(textureDimensions(dstTexture).xy);

    let uv = (vec2f(id.xy) + 0.5) / dstSize;
    let srcCoords = uv * srcSize - 0.5;

    var weightSum = gaussianKernel[0];
    var blurColor = linearSampling(srcCoords, srcSize).rgb * weightSum;

    for (var i: u32 = 1; i <= staticUniform.steps; i++) {
        let weight = gaussianKernel[i];

        let sample1 = linearSampling(srcCoords + vec2f(f32(i), 0.0), srcSize).rgb;
        let sample2 = linearSampling(srcCoords - vec2f(f32(i), 0.0), srcSize).rgb;

        weightSum += 2.0 * weight;
        blurColor += (sample1 + sample2) * weight;
    }

    let output = vec3f(blurColor / weightSum);
    textureStore(dstTexture, vec2i(id.xy), vec4f(output, 1.0));
}
