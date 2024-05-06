// Texture bindings
@group(0) @binding(0) var lodMap: texture_2d<u32>;
@group(0) @binding(1) var dLodMap: texture_storage_2d<r32uint, write>;

// Constants
override blockSize: u32;

fn uvCorrection(uv: vec2f, dim: vec2f) -> vec2f {

    return clamp(uv, vec2f(0.0), dim - vec2f(1.0));
}

fn sample(texture: texture_2d<u32>, uv: vec2f, dim: vec2f) -> i32 {

    let _uv = vec2i(uvCorrection(uv, dim).xy);
    return i32(textureLoad(texture, _uv, 0).r);
}
 
@compute @workgroup_size(blockSize, blockSize, 1)
fn cMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let uv = vec2f(id.xy);
    let lodDim = vec2f(textureDimensions(lodMap, 0).xy);

    if (any(uv >= lodDim)) {
        return;
    }

    let levelM = sample(lodMap, uv, lodDim);
    let levelN = sample(lodMap, uv + vec2f(0.0, -1.0), lodDim);
    let levelE = sample(lodMap, uv + vec2f(1.0, 0.0), lodDim);
    let levelS = sample(lodMap, uv + vec2f(0.0, 1.0), lodDim);
    let levelW = sample(lodMap, uv + vec2f(-1.0, 0.0), lodDim);

    let dNM = u32(select(0, clamp(levelM - levelN, 0, 2), levelN != 0));
    let dEM = u32(select(0, clamp(levelM - levelE, 0, 2), levelE != 0));
    let dSM = u32(select(0, clamp(levelM - levelS, 0, 2), levelS != 0));
    let dWM = u32(select(0, clamp(levelM - levelW, 0, 2), levelW != 0));

    let color = (dNM << 24) + (dEM << 16) + (dSM << 8) + dWM;

    textureStore(dLodMap, id.xy, vec4u(color, 0u, 0u, 0u));
    // textureStore(dLodMap, id.xy, vec4u(levelM, levelM, levelM, levelM));
}
