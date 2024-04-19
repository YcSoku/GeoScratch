struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) @interpolate(perspective, center) texcoords: vec2f,
    @location(1) ndc: vec2f,
};

struct DynamicUniformBlock {
    far: f32,
    near: f32,
    uMatrix: mat4x4f,
    centerLow: vec3f,
    centerHigh: vec3f,
    mvpInverse: mat4x4f,
};

struct FrameUniformBlock {
    randomSeed: f32,
    viewPort: vec2f,
    mapBounds: vec4f,
    zoomLevel: f32,
    progressRate: f32,
    maxSpeed: f32,
    lastMvp: mat4x4f,
    lastMvpInverse: mat4x4f,
};

// Uniform bindings
@group(0) @binding(0) var<uniform> frameUniform: FrameUniformBlock;
@group(0) @binding(1) var<uniform> dynamicUniform: DynamicUniformBlock;

// Texture bindings
@group(1) @binding(0) var bgTexture: texture_2d<f32>;
// @group(1) @binding(1) var depthTexture: texture_depth_2d;

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

fn linearSampling(texture: texture_depth_2d, uv: vec2f, dim: vec2f) -> f32 {

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
    // output.position = (dynamicUniform.mvpInverse * dynamicUniform.uMatrix) * vec4f(position, 0.0, 1.0);
    // output.position = vec4f(output.position.xy, 0.0, 1.0);
    output.position = vec4f(position, 0.0, 1.0);
    output.texcoords = vec2f(uv.x, 1.0 - uv.y);
    output.ndc = position;
    return output;
}

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {


    // let dim = vec2f(textureDimensions(depthTexture, 0).xy);
    // // let depth = textureLoad(depthTexture, vec2i(dim * fsInput.texcoords.xy), 0);
    // let depth = linearSampling(depthTexture, dim * fsInput.texcoords.xy, dim);
    // let currentPos_CS = vec4f(fsInput.ndc, (depth * 2.0) - 1.0, 1.0);
    // let lastPos_LS = dynamicUniform.mvpInverse * currentPos_CS;
    // let lastPos_CS = frameUniform.lastMvp * lastPos_LS;
    // // let lastPos_CS = frameUniform.lastMvp * vec4f(lastPos_LS.xy, depth, 1.0);
    // // let lastPos_LS = frameUniform.lastMvpInverse * currentPos_CS;
    // // let lastPos_CS = dynamicUniform.uMatrix * lastPos_LS;

    // // let lastPos_CS = dynamicUniform.uMatrix * vec4f(lastPos_LS.xy, 0.0, 1.0);
    // let lastPos_NDC = lastPos_CS.xyz / lastPos_CS.w;
    // let motion_vector = fsInput.ndc - lastPos_NDC.xy;
    // var lastUV = lastPos_NDC.xy * 0.5 + 0.5;
    // lastUV = vec2f(lastUV.x, 1.0 - lastUV.y);

    // let color = textureLoad(bgTexture, vec2i(dim * lastUV), 0);
    // if (all(color == vec4f(0.0))) {

    //     return vec4f(0.0);
    // }

    // // return vec4f(lastUV.xy, 0.0, 1.0);
    // if (any(lastPos_NDC > vec3f(1.0)) || any(lastPos_NDC < vec3f(-1.0))) {
        
    //     return vec4f(0.0);
    // }
    // return vec4f(floor(255.0 * color * 0.996) / 255.0);

    ////////////
    let dim = vec2f(textureDimensions(bgTexture, 0).xy);
    let color = textureLoad(bgTexture, vec2i(dim * fsInput.texcoords.xy), 0);
    return vec4f(floor(255.0 * color * 0.996) / 255.0);
    // return vec4f(color);

    // return vec4f(0.6);
    // return color;
    // return vec4f(1.0);
}