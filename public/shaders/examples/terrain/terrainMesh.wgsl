struct VertexInput {
    @builtin(vertex_index) vertexIndex: u32,
    @builtin(instance_index) instanceIndex: u32,
};

struct VertexOutput {
    @builtin(position) position: vec4f,
    @location(0) alpha: f32,
    @location(1) depth: f32,
    @location(2) level: f32,
    @location(3) uv: vec2f,
    @location(4) index: f32,
};

struct StaticUniformBlock {
    terrainBox: vec4f,
    e: vec2f,
};

struct DynamicUniformBlock {
    far: f32,
    near: f32,
    uMatrix: mat4x4f,
    centerLow: vec3f,
    centerHigh: vec3f,
};

struct TileUniformBlock {
    tileBox: vec4f,
    sectorRange: vec2f,
    sectorSize: f32,
    exaggeration: f32,
};

// Uniform Bindings
@group(0) @binding(0) var<uniform> tileUniform: TileUniformBlock;
@group(0) @binding(1) var<uniform> staticUniform: StaticUniformBlock;
@group(0) @binding(2) var<uniform> dynamicUniform: DynamicUniformBlock;

// Storage Bindings
@group(1) @binding(0) var<storage> indices: array<u32>;
@group(1) @binding(1) var<storage> positions: array<f32>;
@group(1) @binding(2) var<storage> level: array<u32>;
@group(1) @binding(3) var<storage> box: array<f32>;

// Texture Bindings
@group(2) @binding(0) var demTexture: texture_2d<f32>;
@group(2) @binding(1) var lodMap: texture_2d<u32>;
@group(2) @binding(2) var dLodMap: texture_2d<u32>;

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

fn translateRelativeToEye(high: vec3f, low: vec3f) -> vec3f {

    let highDiff = high - dynamicUniform.centerHigh;
    let lowDiff = low - dynamicUniform.centerLow;

    return highDiff + lowDiff;
}

fn centroid(triangleID: u32) -> vec2f {

    let v1ID = triangleID * 3 + 0;
    let v2ID = triangleID * 3 + 1;
    let v3ID = triangleID * 3 + 2;

    let v1Index = indices[v1ID];
    let v2Index = indices[v2ID];
    let v3Index = indices[v3ID];

    let v1 = vec2f(positions[v1Index * 2 + 0], positions[v1Index * 2 + 1]);
    let v2 = vec2f(positions[v2Index * 2 + 0], positions[v2Index * 2 + 1]);
    let v3 = vec2f(positions[v3Index * 2 + 0], positions[v3Index * 2 + 1]);

    return (v1 + v2 + v3) / 3.0;
}

fn altitude2Mercator(lat: f32, alt: f32) -> f32 {
    const earthRadius = 6371008.8;
    const earthCircumference = 2.0 * PI * earthRadius;
    return alt / earthCircumference * cos(lat * PI / 180.0);
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

fn positionCS(coord: vec2f, z: f32) -> vec4f {

    var position_CS = dynamicUniform.uMatrix * vec4f(translateRelativeToEye(vec3f(calcWebMercatorCoord(coord), z), vec3f(0.0)), 1.0);

    return position_CS;
}

fn stitching(coord: f32, min: f32, delta: f32, edge: f32) -> f32 {

    let order = floor((coord - min) / delta) % pow(2.0, edge);
    let distance = -order * delta;
    return distance;
}

@vertex
fn vMain(vsInput: VertexInput) -> VertexOutput {

    let triangleID = vsInput.vertexIndex / 3;
    let index = indices[vsInput.vertexIndex];

    let x = positions[index * 2 + 0];
    let y = positions[index * 2 + 1];
    let center = centroid(triangleID);
    let nodeBox = vec4f(
        box[vsInput.instanceIndex * 4 + 0],
        box[vsInput.instanceIndex * 4 + 1],
        box[vsInput.instanceIndex * 4 + 2],
        box[vsInput.instanceIndex * 4 + 3],
    );

    var coord = vec2f(
        mix(nodeBox[0], nodeBox[2], x),
        clamp(mix(nodeBox[1], nodeBox[3], y), -85.0, 85.0),
    );
    let centeroidCoord = vec2f(
        mix(nodeBox[0], nodeBox[2], center.x),
        clamp(mix(nodeBox[1], nodeBox[3], center.y), -85.0, 85.0),
    );

    //////////////////

    var z: f32; var uvs: vec2f; var depth: f32;
    if (all(coord >= staticUniform.terrainBox.xy) && all(coord <= staticUniform.terrainBox.zw)) {

        var lodUV: vec2f;
        let lodDim = vec2f(textureDimensions(lodMap, 0).xy) - vec2f(1.0);
        lodUV.x = floor((centeroidCoord.x - tileUniform.tileBox[0]) / tileUniform.sectorRange.x);
        lodUV.y = 255.0 - floor((centeroidCoord.y - tileUniform.tileBox[1]) / tileUniform.sectorRange.y);

        let mLodUV = clamp(lodUV.xy, vec2f(0.0, 0.0), lodDim);
    
        let deltaXY = vec2f(nodeBox[2] - nodeBox[0], nodeBox[3] - nodeBox[1]) / tileUniform.sectorSize;

        let dLevels = textureLoad(dLodMap, vec2i(mLodUV.xy), 0).r; //N-E-S-W
        let N = f32((dLevels >> 24) & 0xFFu);
        let E = f32((dLevels >> 16) & 0xFFu);
        let S = f32((dLevels >> 8) & 0xFFu);
        let W = f32(dLevels & 0xFFu);

        var offset = vec2f(0.0);

        // Vertical stitching
        if ((coord.x == nodeBox.x || coord.x == nodeBox.z)) {

            let dVertical = f32(select(E, W, coord.x == nodeBox.x));
            offset.y = stitching(coord.y, nodeBox.y, deltaXY.y, dVertical);
        } 
        // Horizontal stitching
        if ((coord.y == nodeBox.y || coord.y == nodeBox.w)) {

            let dHorizontal = f32(select(N, S, coord.y == nodeBox.y));
            offset.x = stitching(coord.x, nodeBox.x, deltaXY.x, dHorizontal);
        } 

        coord += offset;

        let uv = calcUVFromCoord(coord);
        let dim = vec2f(textureDimensions(demTexture, 0).xy);
        let elevation = mix(staticUniform.e.x, staticUniform.e.y, linearSampling(demTexture, uv * dim, dim).r);

        depth = (elevation - staticUniform.e.x) / (staticUniform.e.y - staticUniform.e.x);
        z = tileUniform.exaggeration * altitude2Mercator(coord.y, elevation);
        z = select(z, 0.0, z >= 0.0);
        uvs = uv;

    } else {

        uvs = vec2f(nan());
        depth = nan();
        z = nan();
    }

    var output: VertexOutput;
    output.level = f32(level[vsInput.instanceIndex]);
    output.index = f32(vsInput.instanceIndex);
    output.position = positionCS(coord, z);
    output.depth = depth;
    output.uv = uvs;
    return output;
}

@fragment
fn fMain(fsInput: VertexOutput) -> @location(0) vec4f {
    
    return vec4f(1.0 - fsInput.depth) * 0.5;
    // return vec4f(vec3f(0.0, 0.5, 0.5) * fsInput.depth, 1.0);
}