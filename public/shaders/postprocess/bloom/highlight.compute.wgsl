struct StaticUniformBlock {
    threshold: f32,
};

// Uniform bindings
@group(0) @binding(0) var<uniform> staticUniform: StaticUniformBlock;

// Texture bindings
@group(1) @binding(0) var inTexture: texture_2d<f32>;
@group(1) @binding(1) var outTexture: texture_storage_2d<rgba16float, write>;

// Constants
override blockSize: u32;

fn luminace(color: vec3f) -> f32 {

    return color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
}

fn isOut(uv: vec2i) -> bool {

    let size = textureDimensions(inTexture, 0);
    if (uv.x < 0 || uv.x > i32(size.x) || uv.y < 0 || uv.y > i32(size.y)) {
        return true;
    }
    return false;
}

@compute @workgroup_size(blockSize, blockSize, 1)
fn cMain(@builtin(global_invocation_id) id: vec3<u32>) {

    let uv = vec2i(id.xy);
    if(isOut(uv)) {

        return;
    }

    let color = textureLoad(inTexture, uv, 0);


    let brightness = luminace(color.rgb);
    let highLight = select(vec4f(0.0, 0.0, 0.0, 1.0), color, brightness > staticUniform.threshold);

    textureStore(outTexture, uv, highLight);
    // textureStore(outTexture, uv, color);
}