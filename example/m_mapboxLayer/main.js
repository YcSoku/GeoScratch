import * as scr from '../../src/scratch.js'
import TerrainLayer from './terrainLayer.js'
import SteadyFlowLayer from './steadyFlowLayer.js'
import UnityLayer from './unityLayer.js'

mapboxgl.accessToken = 'pk.eyJ1IjoieWNzb2t1IiwiYSI6ImNrenozdWdodDAza3EzY3BtdHh4cm5pangifQ.ZigfygDi2bK4HXY1pWh-wg'

// DOM Configuration //////////////////////////////////////////////////////////////////////////////////////////////////////
const GPUFrame = document.getElementById('GPUFrame')
GPUFrame.style.pointerEvents = 'none'
GPUFrame.style.zIndex = '1'

const mapDiv = document.createElement('div')
mapDiv.style.height = '100%'
mapDiv.style.width = '100%'
mapDiv.style.zIndex = '0'
mapDiv.id = 'map'
document.body.appendChild(mapDiv)

// StartDash //////////////////////////////////////////////////////////////////////////////////////////////////////
/** @type {TerrainLayer} */     let terrainLayer = undefined
/** @type {SteadyFlowLayer} */  let flowLayer = undefined
scr.StartDash().then(() => {
    
    const map = new ScratchMap({
        style: "mapbox://styles/ycsoku/cldjl0d2m000501qlpmmex490",
        center: [ 120.980697, 31.684162 ], // [ 120.556596, 32.042607 ], //[ 120.53525158459905, 31.94879239156117 ], // 120.980697, 31.684162
        projection: 'mercator',
        GPUFrame: GPUFrame,
        container: 'map',
        antialias: true,
        maxZoom: 18,
        zoom: 9 //10.496958973488436, // 16

    }).on('load', () => {
        
        terrainLayer = new TerrainLayer(14)
        flowLayer = new SteadyFlowLayer('/bin/examples/flow/station.bin',
            [
                '/bin/examples/flow/uvph_0.bin',
                '/bin/examples/flow/uvph_1.bin',
                '/bin/examples/flow/uvph_2.bin',
                '/bin/examples/flow/uvph_3.bin',
                '/bin/examples/flow/uvph_4.bin',
                '/bin/examples/flow/uvph_5.bin',
                '/bin/examples/flow/uvph_6.bin',
                '/bin/examples/flow/uvph_7.bin',
                '/bin/examples/flow/uvph_8.bin',
                '/bin/examples/flow/uvph_9.bin',
                '/bin/examples/flow/uvph_10.bin',
                '/bin/examples/flow/uvph_11.bin',
                '/bin/examples/flow/uvph_12.bin',
                '/bin/examples/flow/uvph_13.bin',
                '/bin/examples/flow/uvph_14.bin',
                '/bin/examples/flow/uvph_15.bin',
                '/bin/examples/flow/uvph_16.bin',
                '/bin/examples/flow/uvph_17.bin',
                '/bin/examples/flow/uvph_18.bin',
                '/bin/examples/flow/uvph_19.bin',
                '/bin/examples/flow/uvph_20.bin',
                '/bin/examples/flow/uvph_21.bin',
                '/bin/examples/flow/uvph_22.bin',
                '/bin/examples/flow/uvph_23.bin',
                '/bin/examples/flow/uvph_24.bin',
                '/bin/examples/flow/uvph_25.bin',
                '/bin/examples/flow/uvph_26.bin', ], url => url.match(/uvph_(\d+)\.bin/)[1]
        )

        // terrainLayer.fieldTexture = flowLayer.fieldTexture = map.screen.createScreenDependentTexture('Texture (Field UVPH)', 'rgba32float')
        
        map.addLayer(terrainLayer)
        map.addLayer(flowLayer)
        // map.addLayer(new UnityLayer([ 120.556596, 32.042607 ], 12))
    })
})

// Map //////////////////////////////////////////////////////////////////////////////////////////////////////
let frameCount = 0
class ScratchMap extends mapboxgl.Map {

    constructor(options) {

        // Init mapbox map
        super(options)

        // Attributes
        this.far = scr.f32()
        this.near = scr.f32()
        this.uMatrix = scr.mat4()
        this.centerLow = scr.vec3f()
        this.mvpInverse = scr.mat4()
        this.uMatrixPure = scr.mat4()
        this.centerHigh = scr.vec3f()
        this.mercatorCenter = scr.vec3f()
        this.zoom = scr.f32(this.getZoom())
        this.mercatorBounds = new scr.BoundingBox2D()
        this.cameraBounds = new scr.BoundingBox2D(...this.getBounds().toArray())

        // Frustum data 
        this.uln = scr.vec3f()
        this.brf = scr.vec3f()
        this.nUp = scr.vec3f()
        this.nFar = scr.vec3f()
        this.nNear = scr.vec3f()
        this.nLeft = scr.vec3f()
        this.nRight = scr.vec3f()
        this.nBottom = scr.vec3f()
        /** @type {[ { point: scr.Vec3f, normal: scr.Vec3f, distance: number } ]} */ this.frustumPlanes = []
        
        // Buffer-related resource (based on map status)
        this.dynamicUniformBuffer = scr.uniformBuffer({
            name: 'Uniform Buffer (Scratch map dynamic status)',
            blocks: [
                scr.bRef({
                    name: 'dynamicUniform',
                    dynamic: true,
                    map: {
                        far: this.far,
                        near: this.near,
                        uMatrix: this.uMatrix,
                        centerLow: this.centerLow,
                        centerHigh: this.centerHigh,
                        mvpInverse: this.mvpInverse,
                    }
                }),
            ]
        })

        // Texture-related resource
        this.screen = scr.screen({ canvas: options.GPUFrame, alphaMode: 'premultiplied'})
        this.depthTexture = this.screen.createScreenDependentTexture('Texture (Map Common Depth)', 'depth32float')

        // Pass
        this.outputPass = scr.renderPass({
            name: 'Render Pass (Scratch map)',
            colorAttachments: [ { colorResource: this.screen } ],
            depthStencilAttachment: { depthStencilResource: this.depthTexture }
        })
        
        // Make stages
        this.preProcessStageName = 'PreRendering'
        this.renderStageName = 'Rendering'
        scr.director.addStage({
            name: this.preProcessStageName,
            items: [],
        })
        scr.director.addStage({
            name: this.renderStageName,
            items: [ this.outputPass ],
        })

        this.on('render', () => {

            this.update()
        })
    }

    update() {

        this.mercatorCenter = new mapboxgl.MercatorCoordinate(...this.transform._computeCameraPosition().slice(0, 3))
        this.zoom.n = this.getZoom()
        
        const { far, near, matrix, cameraFrustum} = getMercatorMatrix(this.transform.clone())
        const mercatorCenterX = encodeFloatToDouble(this.mercatorCenter.x)
        const mercatorCenterY = encodeFloatToDouble(this.mercatorCenter.y)
        const mercatorCenterZ = encodeFloatToDouble(this.mercatorCenter.z)

        this.centerHigh.x = mercatorCenterX[0]
        this.centerHigh.y = mercatorCenterY[0]
        this.centerHigh.z = mercatorCenterZ[0]
        this.centerLow.x = mercatorCenterX[1]
        this.centerLow.y = mercatorCenterY[1]
        this.centerLow.z = mercatorCenterZ[1]

        const { _sw, _ne } = this.getBounds()
        const m_sw = scr.MercatorCoordinate.fromLonLat(_sw.toArray())
        const m_ne = scr.MercatorCoordinate.fromLonLat(_ne.toArray())

        this.mercatorBounds.reset(...m_sw, ...m_ne)
        this.cameraBounds.reset(...this.getBounds().toArray().flat())

        this.far.n = far
        this.near.n = near
        this.uMatrix.clone(matrix)
        this.uMatrixPure.clone(matrix)
        this.uMatrix.translate([ mercatorCenterX[0], mercatorCenterY[0], mercatorCenterZ[0] ])
        this.mvpInverse.invert(this.uMatrix)

        // Frustum
        const points = cameraFrustum.points
        const v01 = scr.vec3f(points[1][0] - points[0][0], points[1][1] - points[0][1], points[1][2] - points[0][2])
        const v03 = scr.vec3f(points[3][0] - points[0][0], points[3][1] - points[0][1], points[3][2] - points[0][2])
        const v04 = scr.vec3f(points[4][0] - points[0][0], points[4][1] - points[0][1], points[4][2] - points[0][2])
        const v62 = scr.vec3f(points[2][0] - points[6][0], points[2][1] - points[6][1], points[2][2] - points[6][2])
        const v65 = scr.vec3f(points[5][0] - points[6][0], points[5][1] - points[6][1], points[5][2] - points[6][2])
        const v67 = scr.vec3f(points[7][0] - points[6][0], points[7][1] - points[6][1], points[7][2] - points[6][2])
        this.uln.copy(scr.vec3f(...points[0]))
        this.brf.copy(scr.vec3f(...points[6]))
        this.nNear.xyz = cameraFrustum.planes[0]
        this.nFar.xyz = cameraFrustum.planes[1]
        this.nLeft.xyz = cameraFrustum.planes[2]
        this.nRight.xyz = cameraFrustum.planes[3]
        this.nBottom.xyz = cameraFrustum.planes[4]
        this.nUp.xyz = cameraFrustum.planes[5]
        this.frustumPlanes = [
            { point: this.uln, normal: this.nNear, distance: cameraFrustum.planes[0][3] },
            { point: this.brf, normal: this.nFar, distance: cameraFrustum.planes[1][3] },
            { point: this.uln, normal: this.nLeft, distance: cameraFrustum.planes[2][3] },
            { point: this.brf, normal: this.nRight, distance: cameraFrustum.planes[3][3] },
            { point: this.brf, normal: this.nBottom, distance: cameraFrustum.planes[4][3] },
            { point: this.uln, normal: this.nUp, distance: cameraFrustum.planes[5][3] },
        ]

        // console.log(this.transform.worldSize)

        // console.log(cameraFrustum.planes[0], this.nNear.xyz)

        // console.log(this.transform.cameraFrustum.points, cameraFrustum.points)
        // console.log(this.transform.cameraFrustum.constructor.fromInvProjectionMatrix)

        // if (frameCount++ === 1000) {
        //     flowLayer.resetResource([
        //         '/bin/examples/flow/uv_14.bin',
        //         '/bin/examples/flow/uv_15.bin',
        //         '/bin/examples/flow/uv_16.bin',
        //         '/bin/examples/flow/uv_17.bin',
        //         '/bin/examples/flow/uv_18.bin',
        //         '/bin/examples/flow/uv_19.bin',
        //         '/bin/examples/flow/uv_20.bin',
        //         '/bin/examples/flow/uv_21.bin',
        //         '/bin/examples/flow/uv_22.bin',
        //         '/bin/examples/flow/uv_23.bin',
        //         '/bin/examples/flow/uv_24.bin',
        //         '/bin/examples/flow/uv_25.bin',
        //         '/bin/examples/flow/uv_26.bin',
        //     ])
        // }

        if (!scr.director.executable) return

        if (0 && frameCount++ >= 1000) {

            scr.director.release()
            console.log('director release')


        } else {

            scr.director.tick()
        }
    }

    add2PreProcess(prePass) {
        
        scr.director.addItem(this.preProcessStageName, prePass)
        return this
    }

    add2RenderPass(pipeline, binding) {

        this.outputPass.add(pipeline, binding)
        return this
    }
}

// Helpers //////////////////////////////////////////////////////////////////////////////////////////////////////

class Plane {

    constructor() {
        this.normal = scr.vec3f()
        this.distance = scr.f32()
    }
}

class Frustum {

    constructor() {
        this.top = new Plane()
        this.bottom = new Plane()

        this.left = new Plane()
        this.right = new Plane()

        this.far = new Plane()
        this.near = new Plane()
    }
}

function createFrustumFromCamera(transform)
{
    const frustum = new Frustum()
    const fovY = transform.fovY
    const zNear = transform._nearZ
    const zFar = transform._farZ
    const aspect = transform.width / transform.height
    const halfVSide = zFar * Math.tan(fovY * 0.5)
    const halfHSide = halfVSide * aspect
    const cameraFront = scr.vec3.normalize(scr.vec3.transformQuat([0.0, 0.0, -1.0], transform._camera._orientation))
    const cameraPos = scr.vec4.transformMat4([0.0, 0.0, 0.0, 1.0], transform._camera._transform)
    const cameraDistance = scr.vec3.length(cameraPos)


    const frontMultFar = scr.vec3.scale(cameraFront, zFar)

    frustum.near.distance.n = cameraDistance + (scr.vec3.length(scr.vec3.scale(cameraFront, zNear)))
    frustum.near.normal.xyz = cameraFront
    // console.log(transform.cameraFrustum.planes[0], frustum.near.normal.xyz)
    // frustum.farFace = { cam.Position + frontMultFar, -cam.Front };
    // frustum.rightFace = { cam.Position,
    // glm::cross(frontMultFar - cam.Right * halfHSide, cam.Up) };
    // frustum.leftFace = { cam.Position,
    // glm::cross(cam.Up,frontMultFar + cam.Right * halfHSide) };
    // frustum.topFace = { cam.Position,
    // glm::cross(cam.Right, frontMultFar - cam.Up * halfVSide) };
    // frustum.bottomFace = { cam.Position,
    // glm::cross(frontMultFar + cam.Up * halfVSide, cam.Right) };

    // return frustum;
}

function getMercatorMatrix(t) {
    
    if (!t.height) return;

    scr.vec3.setDefaultType(Float64Array)
    scr.vec4.setDefaultType(Float64Array)
    scr.Mat4.setDefaultComputeType(Float64Array)

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

    // t._farZ = t.projection.farthestPixelDistance(t);
    t._farZ = farthestPixelDistanceOnPlane(t, -80.06899999999999 * 30.0, pixelsPerMeter)

    // The larger the value of nearZ is
    // - the more depth precision is available for features (good)
    // - clipping starts appearing sooner when the camera is close to 3d features (bad)
    //
    // Smaller values worked well for mapbox-gl-js but deckgl was encountering precision issues
    // when rendering it's layers using custom layers. This value was experimentally chosen and
    // seems to solve z-fighting issues in deckgl while not clipping buildings too close to the camera.
    t._nearZ = t.height / 50;

    // let _farZ = Math.max(Math.pow(2, t.tileZoom), 5000000.0)
    // let _farZ = Math.min(Math.pow(2, t.tileZoom + 5), 50000.0)
    // let _nearZ = Math.max(Math.pow(2, t.tileZoom - 8), 0.0)

    const zUnit = t.projection.zAxisUnit === "meters" ? pixelsPerMeter : 1.0;
    const worldToCamera = t._camera.getWorldToCamera(t.worldSize, zUnit);

    let cameraToClip;

    // Projection matrix
    const cameraToClipPerspective = t._camera.getCameraToClipPerspective(t._fov, t.width / t.height, t._nearZ, t._farZ) 
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

        // const mixValue = t.pitch >= OrthographicPitchTranstionValue ? 1.0 : t.pitch / OrthographicPitchTranstionValue;
        // lerpMatrix(cameraToClip, cameraToClip, cameraToClipPerspective, easeIn(mixValue));
    } else {
        cameraToClip = cameraToClipPerspective;
    }

    const worldToClipPerspective = scr.Mat4.multiplication(cameraToClipPerspective, worldToCamera);
    let m = scr.Mat4.multiplication(cameraToClip, worldToCamera);

    if (t.projection.isReprojectedInTileSpace) {
        // Projections undistort as you zoom in (shear, scale, rotate).
        // Apply the undistortion around the center of the map.
        // const mc = t.locationCoordinate(t.center);
        // const adjustments = scr.Mat4.identity();
        // scr.mat4.translate(adjustments, scr.vec3.fromValues(mc.x * t.worldSize, mc.y * t.worldSize, 0), adjustments);
        // scr.mat4.multiply(adjustments, getProjectionAdjustments(t), adjustments);
        // scr.mat4.translate(adjustments, [-mc.x * t.worldSize, -mc.y * t.worldSize, 0], adjustments);
        // scr.mat4.multiply(m, adjustments, m);
        // scr.mat4.multiply(worldToClipPerspective, adjustments, worldToClipPerspective);
        // t.inverseAdjustmentMatrix = getProjectionAdjustmentInverted(t);
    } else {
        t.inverseAdjustmentMatrix = [1, 0, 0, 1];
    }

    // The mercatorMatrix can be used to transform points from mercator coordinates
    // ([0, 0] nw, [1, 1] se) to GL coordinates. / zUnit compensates for scaling done in worldToCamera.
    t.mercatorMatrix = scr.Mat4.scaling(m, scr.vec3.fromValues(t.worldSize, t.worldSize, t.worldSize / zUnit));
    t.projMatrix = m;

    // For tile cover calculation, use inverted of base (non elevated) matrix
    // as tile elevations are in tile coordinates and relative to center elevation.
    t.invProjMatrix = scr.Mat4.inverse(t.projMatrix);


    // createFrustumFromCamera(t)
    
    // console.log(t.coveringZoomLevel({tileSize: t.tileSize}))
    // console.log(mm)
    const Frustum = t.cameraFrustum.constructor
    // const t1 = t.clone()

    return {
        far: t._farZ,
        near: t._nearZ,
        matrix: t.mercatorMatrix,
        // cameraFrustum: t.cameraFrustum.constructor.fromInvProjectionMatrix(scr.Mat4.inverse(t.mercatorMatrix), t.worldSize, t.zoom, !(t.projection.name === 'globe')),
        cameraFrustum: Frustum.fromInvProjectionMatrix(t.invProjMatrix, t.worldSize, 0.0, !(t.projection.name === 'globe')),
    }
}
function smoothstep(e0, e1, x) {
    x = clamp((x - e0) / (e1 - e0), 0, 1);
    return x * x * (3 - 2 * x);
}
function encodeFloatToDouble(value) {
    const result = new Float32Array(2);
    result[0] = value;
    
    const delta = value - result[0];
    result[1] = delta;
    return result;
}
function circumferenceAtLatitude(latitude) {

    const earthRadius = 6371008.8
    const earthCircumference = 2 * Math.PI * earthRadius
    return earthCircumference * Math.cos(latitude * Math.PI / 180)
}
function mercatorZfromAltitude(altitude, lat) {
    return altitude / circumferenceAtLatitude(lat)
}
function farthestPixelDistanceOnPlane(tr, minElevation, pixelsPerMeter) {
    // Find the distance from the center point [width/2 + offset.x, height/2 + offset.y] to the
    // center top point [width/2 + offset.x, 0] in Z units, using the law of sines.
    // 1 Z unit is equivalent to 1 horizontal px at the center of the map
    // (the distance between[width/2, height/2] and [width/2 + 1, height/2])
    const fovAboveCenter = tr.fovAboveCenter;

    // Adjust distance to MSL by the minimum possible elevation visible on screen,
    // this way the far plane is pushed further in the case of negative elevation.
    const minElevationInPixels = minElevation * pixelsPerMeter;
    const cameraToSeaLevelDistance = ((tr._camera.position[2] * tr.worldSize) - minElevationInPixels) / Math.cos(tr._pitch);
    const topHalfSurfaceDistance = Math.sin(fovAboveCenter) * cameraToSeaLevelDistance / Math.sin(Math.max(Math.PI / 2.0 - tr._pitch - fovAboveCenter, 0.01));

    // Calculate z distance of the farthest fragment that should be rendered.
    const furthestDistance = Math.sin(tr._pitch) * topHalfSurfaceDistance + cameraToSeaLevelDistance;
    const horizonDistance = cameraToSeaLevelDistance * (1 / tr._horizonShift);

    // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
    return Math.min(furthestDistance * 1.01, horizonDistance);
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



// /// unity

// /**
//  * transform: camera
//  */
// initialize(transform)

// resize()

// /**
//  * string
//  */
// executeCommand()

// shutDown()

// /////////

// updateCamera()

// /**
//  * tick render
//  */
// tick()

// /**
//  * rayCast or
//  * screen {x, y}
//  */
// pickUp()
