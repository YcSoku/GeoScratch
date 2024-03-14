import * as scr from '../../src/scratch.js'
import { LocalTerrain } from '../../src/application/terrain/localTerrain.js'

mapboxgl.accessToken = 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg'

// var map = new mapboxgl.Map()

const options = {
    zoom: 9,
    maxZoom: 20,
    antialias: true,
    container: 'map',
    projection: 'mercator',
    center: [ 120.980697, 31.684162 ],
    style: "mapbox://styles/ycsoku/cldjl0d2m000501qlpmmex490",
    GPUFrame: document.getElementById('GPUFrame')
}

// map.on('load', () => scr.StartDash().then(() => scratchMap(document.getElementById('GPUFrame'))))

//////////////////////////////////////////////////////////////////////////////////////////////////////

// Global setting
const MAX_LEVEL = 14
const uMatrix = scr.mat4f()
const centerLow = scr.vec2f()
const centerHigh = scr.vec2f()

class ScratchMap extends mapboxgl.Map {

    constructor(options) {

        // Init mapbox map
        super({
            zoom: options.zoom,
            maxZoom: options.maxZoom,
            antialias: options.antialias,
            container: options.container,
            projection: options.projection,
            center: options.center,
            style: options.style,
        })
        
        // Buffer-related resource (based on map status)
        this.gDynamicBuffer = scr.uniformBuffer({
            name: 'Uniform Buffer (Terrain global dynamic)',
            blocks: [
                scr.bRef({
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        uMatrix,
                        centerLow,
                        centerHigh,
                    }
                }),
            ]
        })

        // Texture-related resource
        this.screen = scr.screen({ canvas: options.GPUFrame, alphaMode: 'premultiplied' })
        this.outputPass = scr.renderPass({
            name: 'Render Pass (Scratch map)',
            colorAttachments: [ { colorResource: this.screen } ],
            depthStencilAttachment: { depthStencilResource: this.screen.createScreenDependentTexture('Texture (Depth)', 'depth24plus') }
        })
        
        // Make stage
        scr.director.addStage({
            name: 'PreRendering',
            items: [],
        })
        scr.director.addStage({
            name: 'Rendering',
            items: [ this.outputPass ],
        })
    }


    // OutputPass
    // const outputPass = initOutputPass(terrainLayer.terrain.output)

    // console.log(terrainLayer.pass)

}

    // Terrain layer
    // Add layer to map
    // map.addLayer(terrainLayer).triggerRepaint()
    // const terrainLayer = new TerrainLayer(gDynamicBuffer, outputPass)
class TerrainLayer extends LocalTerrain {

    constructor() {

        super(MAX_LEVEL)

        this.renderingMode = '3d'
        this.id = 'TerrainLayer'
        this.map = undefined
        this.type = 'custom'
    }

    onAdd(map, gl) {

        this.map = map

        this.setResource(map.gDynamicBuffer, map.outputPass)
        scr.director.addItem('PreRendering', this.lodMapPass)
    }

    render(gl, matrix) {

        const mercatorCenter = new mapboxgl.MercatorCoordinate(...this.map.transform._computeCameraPosition().slice(0, 3))
        const mercatorCenterX = encodeFloatToDouble(mercatorCenter.x)
        const mercatorCenterY = encodeFloatToDouble(mercatorCenter.y)
        centerHigh.x = mercatorCenterX[0]
        centerHigh.y = mercatorCenterY[0]
        centerLow.x = mercatorCenterX[1]
        centerLow.y = mercatorCenterY[1]
        
        uMatrix.data = getMercatorMatrix(this.map.transform.clone())
        uMatrix.translate(scr.vec3f(mercatorCenterX[0], mercatorCenterY[0], 0.0))

        this.registerRenderableNode({
            cameraBounds: new scr.BoundingBox2D(...this.map.getBounds().toArray().flat()),
            cameraPos: mercatorCenter.toLngLat().toArray(),
            zoomLevel: this.map.getZoom(),
        })

        scr.director.tick()
    }
}


scr.StartDash().then(() => {

    const map = new ScratchMap(options)
    map.on('load', () => {
    
        map.addLayer(new TerrainLayer()).triggerRepaint()
    })
})

const encodeFloatToDouble = function(value) {
    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
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
