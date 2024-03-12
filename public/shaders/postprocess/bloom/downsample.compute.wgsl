// Texture bindings
@group(0) @binding(0) var srcTexture: texture_2d<f32>;
@group(0) @binding(1) var dstTexture: texture_storage_2d<rgba16float, write>;

// Constants
override blockSize: u32;

fn isOut(uv: vec2i) -> bool {

    let size = textureDimensions(srcTexture, 0);
    if (uv.x < 0 || uv.x > i32(size.x) || uv.y < 0 || uv.y > i32(size.y)) {
        return true;
    }
    return false;
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

    let color = linearSampling(srcCoords, srcSize);

    textureStore(dstTexture, vec2i(id.xy), color);
}