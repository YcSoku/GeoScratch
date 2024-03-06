struct StaticUniformBlock {
    steps: u32,
    direction: vec2f,
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

fn gaussian(x: f32, sigma: f32) -> f32 {

    let a = 1.0 / (sigma * sqrt(2.0 * 3.141592653));
    return a * exp(-((x * x) / (2.0 * sigma * sigma)));
}

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

@compute @workgroup_size(blockSize, blockSize, 1)
fn cMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let srcSize = vec2f(textureDimensions(srcTexture, 0).xy);
    let dstSize = vec2f(textureDimensions(dstTexture).xy);

    let uv = (vec2f(id.xy) + 0.5) / dstSize;
    let srcCoords = uv * srcSize - 0.5;

    let sigma = 1.0;
    var weightSum = gaussian(0.0, sigma);
    var blurColor = linearSampling(srcCoords, srcSize).rgb * weightSum;

    for (var i: u32 = 1; i <= staticUniform.steps; i++) {
        let weight = gaussian(f32(i), sigma);

        let sample1 = linearSampling(srcCoords + staticUniform.direction, srcSize).rgb;
        let sample2 = linearSampling(srcCoords - staticUniform.direction, srcSize).rgb;

        weightSum += 2.0 * weight;
        blurColor += (sample1 + sample2) * weight;
    }

    var output = vec3f(blurColor / weightSum);
    output += select(vec3f(0.0), textureLoad(highLightTexture, vec2i(id.xy), 0).rgb, staticUniform.direction.y == 1.0);
    textureStore(dstTexture, vec2i(id.xy), vec4f(output, 1.0));
}