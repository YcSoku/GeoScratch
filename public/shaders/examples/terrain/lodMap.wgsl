struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) level: f32,
};

struct StaticUniformBlock {
    terrainBox: vec4f,
    e: vec2f,
};

struct TileUniformBlock {
    tileBox: vec4f,
    levelRange: vec2f,
    sectorSize: vec2f,
};

// Uniform Bindings
@group(0) @binding(0) var<uniform> tileUniform: TileUniformBlock;
@group(0) @binding(1) var<uniform> staticUniform: StaticUniformBlock;

// Storage Bindings
@group(1) @binding(0) var<storage> level: array<u32>;
@group(1) @binding(1) var<storage> box: array<f32>;

const PI = 3.141592653;

fn calcWebMercatorCoord(coord: vec2f) -> vec2f {

    let lon = (180.0 + coord.x) / 360.0;
    let lat = (180.0 - (180.0 / PI * log(tan(PI / 4.0 + coord.y * PI / 360.0)))) / 360.0;
    return vec2f(lon, lat);
}

fn calcUVFromCoord(coord: vec2f) -> vec2f {

    let u = (coord.x - staticUniform.terrainBox[0]) / (staticUniform.terrainBox[2] - staticUniform.terrainBox[0]);
    let v = (coord.y - staticUniform.terrainBox[1]) / (staticUniform.terrainBox[3] - staticUniform.terrainBox[1]);
    return vec2f(u, v);
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

fn IDW(texture: texture_2d<f32>, uv: vec2f, dim: vec2f, step: i32, p: f32) -> vec4f {

    let steps = vec2i(step, i32(ceil(f32(step) * dim.y / dim.x)));
    var weightSum = 0.0;
    var value = vec4f(0.0);
    for (var i = -steps.x; i < steps.x; i++ ) {
        for (var j = -steps.y; j < steps.y; j++) {

            let offset = vec2f(f32(i), f32(j));
            let distance = length(offset);
            let w = 1.0 / pow(select(distance, 1.0, distance == 0.0), p);

            let texcoords = uv + offset;
            value += linearSampling(texture, texcoords, dim) * w;
            weightSum += w;
        }
    }

    return value / weightSum;
}

fn nan() -> f32 {

    let a = 0.0;
    let b = 0.0;
    return a / b;
}

fn overlap(box: vec4f) -> bool {

    if (box[0] > staticUniform.terrainBox[2] || box[2] < staticUniform.terrainBox[0]) {
        return false;
    }
    if (box[1] > staticUniform.terrainBox[3] || box[3] < staticUniform.terrainBox[1]) {
        return false;
    }
    return true;
}



@vertex
fn vMain(vsInput: VertexInput) -> VertexOutput {

    let sectorSizeX = (tileUniform.tileBox[2] - tileUniform.tileBox[0]) / tileUniform.sectorSize.x;
    let sectorSizeY = (tileUniform.tileBox[3] - tileUniform.tileBox[1]) / tileUniform.sectorSize.y;

    let nodeStartX = floor((box[vsInput.instanceIndex * 4 + 0] - tileUniform.tileBox[0]) / tileUniform.sectorSize.x);
    let nodeStartY = floor((box[vsInput.instanceIndex * 4 + 1] - tileUniform.tileBox[1]) / tileUniform.sectorSize.y);
    let nodeEndX = floor((box[vsInput.instanceIndex * 4 + 2] - tileUniform.tileBox[0]) / tileUniform.sectorSize.x);
    let nodeEndY = floor((box[vsInput.instanceIndex * 4 + 3] - tileUniform.tileBox[1]) / tileUniform.sectorSize.y);
    
    let vertices = array<vec2f, 4>(
        vec2f(nodeStartX, nodeStartY),
        vec2f(nodeEndX, nodeStartY),
        vec2f(nodeStartX, nodeEndY),
        vec2f(nodeEndX, nodeEndY),
    );

    let vertex = vertices[vsInput.vertexIndex] / 256.0;

    var output: VertexOutput;
    output.position = vec4f(vertex * 2.0 - 1.0, 0.0, 1.0);
    output.level = f32(level[vsInput.instanceIndex]);
    return output;
}

fn colorMap(index: u32) -> vec3f {

    let palette = array<vec3f, 11> (
        vec3f(158.0, 1.0, 66.0),
        vec3f(213.0, 62.0, 79.0),
        vec3f(244.0, 109.0, 67.0),
        vec3f(253.0, 174.0, 97.0),
        vec3f(254.0, 224.0, 139.0),
        vec3f(255.0, 255.0, 191.0),
        vec3f(230.0, 245.0, 152.0),
        vec3f(171.0, 221.0, 164.0),
        vec3f(102.0, 194.0, 165.0),
        vec3f(50.0, 136.0, 189.0),
        vec3f(94.0, 79.0, 162.0),
    );

    return palette[index] / 255.0;
}

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {
    
    let level = clamp(14 - u32(fsInput.level), 0, 10);

    // return vec4f(colorMap(level), 1.0);
    return vec4f(fsInput.level / 255.0);

    // return vec4f(1.0 - fsInput.depth);
    // return vec4f(0.5);
}