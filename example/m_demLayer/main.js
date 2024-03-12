import { LocalTerrain } from '../../src/application/terrain/localTerrain.js';
import * as scr from '../../src/scratch.js'

mapboxgl.accessToken = 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg';

let ORIGIN = [121.496140, 25.056555, -20]

var map = new mapboxgl.Map({
    container: 'map',
    // style: 'mapbox://styles/mapbox/light-v9', // style URL
    style: "mapbox://styles/ycsoku/cldjl0d2m000501qlpmmex490", // style URL
    // style: 'mapbox://styles/ycsoku/clrjfv4jz00pe01pdfxgshp6z',
    center: [120.980697, 31.684162], // starting position [lng, lat]
    zoom: 9,
    maxZoom: 20,
    antialias: true,
    projection: 'mercator'
})

const encodeFloatToDouble = function(value) {
    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
}

map.on('load', () => scr.StartDash().then(() => main(document.getElementById('GPUFrame'))))

// Global setteing
const MAX_LEVEL = 14
const z = scr.vec2f()
const zoom = scr.f32()
const centerLow = scr.vec2f()
const centerHigh = scr.vec2f()

// Terrain
let terrain = undefined

// Global matrix
const mapMatrix = scr.mat4f()
const originMatrix = scr.mat4f()

const main = function(canvas) {

    // Screen canvas
    const screen = scr.screen({ canvas, alphaMode: 'premultiplied' })

    // Global sampler
    const lSampler = scr.sampler({
        name: 'Sampler (Linear)',
        filterMinMag: ['linear', 'linear'],
        addressModeUVW: ['repeat', 'repeat'],
    })

    const init = function() {

        // Texture-related resource
        const sceneTexture = screen.createScreenDependentTexture('Texture (Scene)')
        const depthTexture = screen.createScreenDependentTexture('Texture (Depth)', 'depth24plus')

        const gStaticBuffer = scr.uniformBuffer({
            name: 'Uniform Buffer (Terrain global static)',
            blocks: [
                scr.bRef({
                    name: 'block',
                    map: {
                        terrainBox: scr.asVec4f(120.0437360613468201, 31.1739019522094871, 121.9662324011692220, 32.0840108580467813),
                        e: scr.asVec2f(-80.06899999999999, 4.3745)
                    }
                }),
            ]
        }).use()
        const gDynamicBuffer = scr.UniformBuffer.create({
            name: 'Uniform Buffer (Terrain global dynamic)',
            blocks: [
                scr.bRef({
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        matrix: mapMatrix,
                        oMatrix: originMatrix,
                        exaggeration: scr.asF32(3.0),
                        zoom: zoom,
                        centerLow: centerLow,
                        centerHigh: centerHigh,
                        z: z,
                    }
                }),
            ]
        }).use()

        terrain = new LocalTerrain(MAX_LEVEL).setBinding(gStaticBuffer, gDynamicBuffer).setPass(sceneTexture, depthTexture)

        const outputBinding = scr.binding({
            range: () => [ 4 ],
            samplers: [ { sampler: lSampler } ],
            uniforms: [
                {
                    name: 'staticUniform',
                    map: {
                        gamma: scr.asF32(1.0),
                    }
                }
            ],
            textures: [ { texture: sceneTexture} ]
        })
    
        const outputPipeline = scr.renderPipeline({
            shader: { module: scr.shaderLoader.load('Shader (Output)', '/shaders/examples/terrain/last.wgsl') },
            primitive: { topology: 'triangle-strip' },
        })

        const outputRenderPass = scr.renderPass({
            name: 'DEM Layer Output',
            colorAttachments: [ { colorResource: screen } ]
        }).add(outputPipeline, outputBinding)

        scr.director.addStage({
            name: 'Water DEM Shower',
            items: [
                terrain.lodMapPass,
                terrain.meshRenderPass,
                outputRenderPass
            ],
            visibility: true,
        })
    }

    init()
    map.addLayer(new TerrainLayer())
}

class TerrainLayer {

    constructor() {

        this.id = 'TerrainLayer'
        this.type = 'custom'
        this.renderingMode = '3d'
        this.map = undefined
        this.isInitialized = false
    }

    onAdd(map, gl) {

        /**
         * @type {mapboxgl.Map}
         */
        this.map = map
    }

    render(gl, matrix) {

        if (!terrain) return

        zoom.data = this.map.getZoom()
        const mapCenter = this.map.getCenter()
        const cameraBounds = new scr.BoundingBox2D(...this.map.getBounds().toArray().flat())
        const cameraPos = new mapboxgl.MercatorCoordinate(...this.map.transform._computeCameraPosition().slice(0, 2)).toLngLat()
        const cameraHeight = new mapboxgl.MercatorCoordinate(...this.map.transform._computeCameraPosition().slice(0, 3)).toAltitude()

        const mercatorCenter = mapboxgl.MercatorCoordinate.fromLngLat([mapCenter.lng, mapCenter.lat], cameraHeight)
        const mercatorCenterX = encodeFloatToDouble(mercatorCenter.x)
        const mercatorCenterY = encodeFloatToDouble(mercatorCenter.y)
        const mercatorCenterZ = encodeFloatToDouble(mercatorCenter.z)
        z.y = mercatorCenterZ[1]
        z.x = mercatorCenterZ[0]
        centerLow.x = mercatorCenterX[1]
        centerLow.y = mercatorCenterY[1]
        centerHigh.x = mercatorCenterX[0]
        centerHigh.y = mercatorCenterY[0]

        mapMatrix.data = new Float32Array(getMercatorMatrix(this.map.transform.clone()))
        mapMatrix.data[12] += mapMatrix.data[0] * centerHigh.x + mapMatrix.data[4] * centerHigh.y
        mapMatrix.data[13] += mapMatrix.data[1] * centerHigh.x + mapMatrix.data[5] * centerHigh.y
        mapMatrix.data[14] += mapMatrix.data[2] * centerHigh.x + mapMatrix.data[6] * centerHigh.y
        mapMatrix.data[15] += mapMatrix.data[3] * centerHigh.x + mapMatrix.data[7] * centerHigh.y

        terrain.registerRenderableNode({
            cameraBounds,
            cameraPos: [cameraPos.lng, cameraPos.lat],
            zoomLevel: zoom.data,
        })

        scr.director.tick()
        this.map.triggerRepaint()
    }
}

function smoothstep(e0, e1, x) {
    x = clamp((x - e0) / (e1 - e0), 0, 1);
    return x * x * (3 - 2 * x);
}

function getProjectionInterpolationT(projection, zoom, width, height, maxSize = Infinity) {
    const range = projection.range;
    if (!range) return 0;

    const size = Math.min(maxSize, Math.max(width, height));
    // The interpolation ranges are manually defined based on what makes
    // sense in a 1024px wide map. Adjust the ranges to the current size
    // of the map. The smaller the map, the earlier you can start unskewing.
    const rangeAdjustment = Math.log(size / 1024) / Math.LN2;
    const zoomA = range[0] + rangeAdjustment;
    const zoomB = range[1] + rangeAdjustment;
    const t = smoothstep(zoomA, zoomB, zoom);
    return t;
}

function getMercatorMatrix(t) {
    
    if (!t.height) return;

    const offset = t.centerOffset;

    // Z-axis uses pixel coordinates when globe mode is enabled
    const pixelsPerMeter = t.pixelsPerMeter;

    if (t.projection.name === 'globe') {
        t._mercatorScaleRatio = mercatorZfromAltitude(1, t.center.lat) / mercatorZfromAltitude(1, GLOBE_SCALE_MATCH_LATITUDE);
    }

    const projectionT = getProjectionInterpolationT(t.projection, t.zoom, t.width, t.height, 1024);

    // 'this._pixelsPerMercatorPixel' is the ratio between pixelsPerMeter in the current projection relative to Mercator.
    // This is useful for converting e.g. camera position between pixel spaces as some logic
    // such as raycasting expects the scale to be in mercator pixels
    t._pixelsPerMercatorPixel = t.projection.pixelSpaceConversion(t.center.lat, t.worldSize, projectionT);

    t.cameraToCenterDistance = 0.5 / Math.tan(t._fov * 0.5) * t.height * t._pixelsPerMercatorPixel;

    t._updateCameraState();

    t._farZ = t.projection.farthestPixelDistance(t);

    // The larger the value of nearZ is
    // - the more depth precision is available for features (good)
    // - clipping starts appearing sooner when the camera is close to 3d features (bad)
    //
    // Smaller values worked well for mapbox-gl-js but deckgl was encountering precision issues
    // when rendering it's layers using custom layers. This value was experimentally chosen and
    // seems to solve z-fighting issues in deckgl while not clipping buildings too close to the camera.
    t._nearZ = t.height / 50;

    let _farZ = Math.max(Math.pow(2, t.tileZoom), 5000000.0)
    // let _farZ = Math.min(Math.pow(2, t.tileZoom + 5), 50000.0)
    // let _nearZ = Math.max(Math.pow(2, t.tileZoom - 8), 0.0)

    const zUnit = t.projection.zAxisUnit === "meters" ? pixelsPerMeter : 1.0;
    const worldToCamera = t._camera.getWorldToCamera(t.worldSize, zUnit);

    let cameraToClip;

    const cameraToClipPerspective = t._camera.getCameraToClipPerspective(t._fov, t.width / t.height, t._nearZ, _farZ);
    // Apply offset/padding
    cameraToClipPerspective[8] = -offset.x * 2 / t.width;
    cameraToClipPerspective[9] = offset.y * 2 / t.height;

    if (t.isOrthographic) {
        const cameraToCenterDistance =  0.5 * t.height / Math.tan(t._fov / 2.0) * 1.0;

        // Calculate bounds for orthographic view
        let top = cameraToCenterDistance * Math.tan(t._fov * 0.5);
        let right = top * t.aspect;
        let left = -right;
        let bottom = -top;
        // Apply offset/padding
        right -= offset.x;
        left -= offset.x;
        top += offset.y;
        bottom += offset.y;

        cameraToClip = t._camera.getCameraToClipOrthographic(left, right, bottom, top, t._nearZ, t._farZ);

        const mixValue =
        t.pitch >= OrthographicPitchTranstionValue ? 1.0 : t.pitch / OrthographicPitchTranstionValue;
        // lerpMatrix(cameraToClip, cameraToClip, cameraToClipPerspective, easeIn(mixValue));
    } else {
        cameraToClip = cameraToClipPerspective;
    }

    const worldToClipPerspective = scr.mat4.mul(cameraToClipPerspective, worldToCamera);
    let m = scr.mat4.mul(cameraToClip, worldToCamera);

    if (t.projection.isReprojectedInTileSpace) {
        // Projections undistort as you zoom in (shear, scale, rotate).
        // Apply the undistortion around the center of the map.
        const mc = t.locationCoordinate(t.center);
        const adjustments = scr.mat4.identity();
        scr.mat4.translate(adjustments, scr.vec3.fromValues(mc.x * t.worldSize, mc.y * t.worldSize, 0), adjustments);
        scr.mat4.multiply(adjustments, getProjectionAdjustments(t), adjustments);
        scr.mat4.translate(adjustments, [-mc.x * t.worldSize, -mc.y * t.worldSize, 0], adjustments);
        scr.mat4.multiply(m, adjustments, m);
        scr.mat4.multiply(worldToClipPerspective, adjustments, worldToClipPerspective);
        t.inverseAdjustmentMatrix = getProjectionAdjustmentInverted(t);
    } else {
        t.inverseAdjustmentMatrix = [1, 0, 0, 1];
    }

    // The mercatorMatrix can be used to transform points from mercator coordinates
    // ([0, 0] nw, [1, 1] se) to GL coordinates. / zUnit compensates for scaling done in worldToCamera.
    t.mercatorMatrix = scr.mat4.scale(m, scr.vec4.fromValues(t.worldSize, t.worldSize, t.worldSize / zUnit, 1.0));
    t.projMatrix = m;

    // For tile cover calculation, use inverted of base (non elevated) matrix
    // as tile elevations are in tile coordinates and relative to center elevation.
    t.invProjMatrix = scr.mat4.invert(t.projMatrix);

    return t.mercatorMatrix
}

function circumferenceAtLatitude(latitude) {

    const earthRadius = 6371008.8
    const earthCircumference = 2 * Math.PI * earthRadius
    return earthCircumference * Math.cos(latitude * Math.PI / 180)
}

function mercatorZfromAltitude(altitude, lat) {
    return altitude / circumferenceAtLatitude(lat)
}

function getMercatorMatrix2(t) {
    
    if (!t.height) return;

    const offset = t.centerOffset;

    // Z-axis uses pixel coordinates when globe mode is enabled
    const pixelsPerMeter = t.pixelsPerMeter;

    if (t.projection.name === 'globe') {
        t._mercatorScaleRatio = mercatorZfromAltitude(1, t.center.lat) / mercatorZfromAltitude(1, GLOBE_SCALE_MATCH_LATITUDE);
    }

    const projectionT = getProjectionInterpolationT(t.projection, t.zoom, t.width, t.height, 1024);

    // 'this._pixelsPerMercatorPixel' is the ratio between pixelsPerMeter in the current projection relative to Mercator.
    // This is useful for converting e.g. camera position between pixel spaces as some logic
    // such as raycasting expects the scale to be in mercator pixels
    t._pixelsPerMercatorPixel = t.projection.pixelSpaceConversion(t.center.lat, t.worldSize, projectionT);

    t.cameraToCenterDistance = 0.5 / Math.tan(t._fov * 0.5) * t.height * t._pixelsPerMercatorPixel;

    t._updateCameraState();

    t._farZ = t.projection.farthestPixelDistance(t);

    // The larger the value of nearZ is
    // - the more depth precision is available for features (good)
    // - clipping starts appearing sooner when the camera is close to 3d features (bad)
    //
    // Smaller values worked well for mapbox-gl-js but deckgl was encountering precision issues
    // when rendering it's layers using custom layers. This value was experimentally chosen and
    // seems to solve z-fighting issues in deckgl while not clipping buildings too close to the camera.
    t._nearZ = t.height / 50;

    let _farZ = Math.max(t._farZ, - 1 / mercatorZfromAltitude(-80.06899999999999, t.center.lat))
    let _nearZ = Math.max(t._nearZ, mercatorZfromAltitude(4.3745, t.center.lat))

    const zUnit = t.projection.zAxisUnit === "meters" ? pixelsPerMeter : 1.0;
    const worldToCamera = t._camera.getWorldToCamera(t.worldSize, zUnit);

    let cameraToClip;

    const cameraToClipPerspective = t._camera.getCameraToClipPerspective(t._fov, t.width / t.height, _nearZ, _farZ);
    // Apply offset/padding
    cameraToClipPerspective[8] = -offset.x * 2 / t.width;
    cameraToClipPerspective[9] = offset.y * 2 / t.height;

    if (t.isOrthographic) {
        const cameraToCenterDistance =  0.5 * t.height / Math.tan(t._fov / 2.0) * 1.0;

        // Calculate bounds for orthographic view
        let top = cameraToCenterDistance * Math.tan(t._fov * 0.5);
        let right = top * t.aspect;
        let left = -right;
        let bottom = -top;
        // Apply offset/padding
        right -= offset.x;
        left -= offset.x;
        top += offset.y;
        bottom += offset.y;

        cameraToClip = t._camera.getCameraToClipOrthographic(left, right, bottom, top, t._nearZ, t._farZ);

        const mixValue =
        t.pitch >= OrthographicPitchTranstionValue ? 1.0 : t.pitch / OrthographicPitchTranstionValue;
        // lerpMatrix(cameraToClip, cameraToClip, cameraToClipPerspective, easeIn(mixValue));
    } else {
        cameraToClip = cameraToClipPerspective;
    }

    const worldToClipPerspective = scr.mat4.mul([], cameraToClipPerspective, worldToCamera);
    let m = scr.mat4.mul([], cameraToClip, worldToCamera);

    if (t.projection.isReprojectedInTileSpace) {
        // Projections undistort as you zoom in (shear, scale, rotate).
        // Apply the undistortion around the center of the map.
        const mc = t.locationCoordinate(t.center);
        const adjustments = scr.mat4.identity([]);
        scr.mat4.translate(adjustments, adjustments, [mc.x * t.worldSize, mc.y * t.worldSize, 0]);
        scr.mat4.multiply(adjustments, adjustments, getProjectionAdjustments(t));
        scr.mat4.translate(adjustments, adjustments, [-mc.x * t.worldSize, -mc.y * t.worldSize, 0]);
        scr.mat4.multiply(m, m, adjustments);
        scr.mat4.multiply(worldToClipPerspective, worldToClipPerspective, adjustments);
        t.inverseAdjustmentMatrix = getProjectionAdjustmentInverted(t);
    } else {
        t.inverseAdjustmentMatrix = [1, 0, 0, 1];
    }

    // The mercatorMatrix can be used to transform points from mercator coordinates
    // ([0, 0] nw, [1, 1] se) to GL coordinates. / zUnit compensates for scaling done in worldToCamera.
    t.mercatorMatrix = scr.scr.mat4.scale([], m, [t.worldSize, t.worldSize, t.worldSize / zUnit, 1.0]);

    t.projMatrix = m;

    // For tile cover calculation, use inverted of base (non elevated) matrix
    // as tile elevations are in tile coordinates and relative to center elevation.
    t.invProjMatrix = scr.mat4.invert(new Float64Array(16), t.projMatrix);

    return t.mercatorMatrix
}
