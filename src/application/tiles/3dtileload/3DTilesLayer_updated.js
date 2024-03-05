const MERCATOR_A = 6378137.0
const WORLD_SIZE = MERCATOR_A * Math.PI * 2

const ThreeboxConstants = {
    WORLD_SIZE: WORLD_SIZE,
    PROJECTION_WORLD_SIZE: WORLD_SIZE / (MERCATOR_A * Math.PI * 2),
    MERCATOR_A: MERCATOR_A,
    DEG2RAD: Math.PI / 180,
    RAD2DEG: 180 / Math.PI,
    EARTH_CIRCUMFERENCE: 40075000, // In meters
}

class MapCameraSync {
    
    constructor(map, camera, world) {
        this.map = map;
        this.camera = camera;
        this.active = true;
        this.updateCallback = () => { };

        this.camera.matrixAutoUpdate = false;   // We're in charge of the camera now!

        // Postion and configure the world group so we can scale it appropriately when the camera zooms
        this.world = world || new THREE.Group();
        this.world.position.x = this.world.position.y = ThreeboxConstants.WORLD_SIZE / 2;
        this.world.matrixAutoUpdate = false;

        //set up basic camera state
        this.state = {
            fov: 0.6435011087932844, // Math.atan(0.75);
            translateCenter: new THREE.Matrix4(),
            worldSizeRatio: 512 / ThreeboxConstants.WORLD_SIZE
        };

        this.state.translateCenter.makeTranslation(ThreeboxConstants.WORLD_SIZE / 2, -ThreeboxConstants.WORLD_SIZE / 2, 0);

        // Listen for move events from the map and update the Three.js camera. Some attributes only change when viewport resizes, so update those accordingly
        this.map.on('move', () => this.updateCamera());
        this.map.on('resize', () => this.setupCamera());

        this.setupCamera();
    }
    setupCamera() {

        var t = this.map.transform;
        const halfFov = this.state.fov / 2;
        var cameraToCenterDistance = 0.5 / Math.tan(halfFov) * t.height;

        this.state.cameraToCenterDistance = cameraToCenterDistance;
        this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(0, 0, cameraToCenterDistance);
        // const cameraPosition = this.map.getFreeCameraOptions().position
        // this.state.cameraTranslateZ = new THREE.Matrix4().makeTranslation(cameraPosition.x, cameraPosition.y, cameraPosition.z);

        this.updateCamera();
    }
    updateCamera() {

        if (!this.camera) {
            console.log('nocamera');
            return;
        }

        var t = this.map.transform;

        var halfFov = t._fov / 2;
        const groundAngle = Math.PI / 2 + t._pitch;
        this.state.topHalfSurfaceDistance = Math.sin(halfFov) * this.state.cameraToCenterDistance / Math.sin(Math.PI - groundAngle - halfFov);

        // Calculate z distance of the farthest fragment that should be rendered.
        const furthestDistance = Math.cos(Math.PI / 2 - t._pitch) * this.state.topHalfSurfaceDistance + this.state.cameraToCenterDistance;

        // Add a bit extra to avoid precision problems when a fragment's distance is exactly `furthestDistance`
        const farZ = furthestDistance * 1.01;

        this.camera.projectionMatrix = this.makePerspectiveMatrix(this.state.fov, t.width / t.height, 1, farZ);


        var cameraWorldMatrix = new THREE.Matrix4();
        var rotatePitch = new THREE.Matrix4().makeRotationX(t._pitch);
        var rotateBearing = new THREE.Matrix4().makeRotationZ(t.angle);

        // Unlike the Mapbox GL JS camera, separate camera translation and rotation out into its world matrix
        // If this is applied directly to the projection matrix, it will work OK but break raycasting

        cameraWorldMatrix
            .premultiply(this.state.cameraTranslateZ)
            .premultiply(rotatePitch)
            .premultiply(rotateBearing);


        this.camera.matrixWorld.copy(cameraWorldMatrix);

        // Handle scaling and translation of objects in the map in the world's matrix transform, not the camera
        let zoomPow = t.scale * this.state.worldSizeRatio;
        let scale = new THREE.Matrix4();
        scale.makeScale(zoomPow, zoomPow, zoomPow);
        //console.log(`zoomPow: ${zoomPow}`);

        let translateMap = new THREE.Matrix4();

        let x = -this.map.transform.x || -this.map.transform.point.x;
        let y = this.map.transform.y || this.map.transform.point.y;

        translateMap.makeTranslation(x, y, 0);

        this.world.matrix = new THREE.Matrix4;
        this.world.matrix
            //.premultiply(rotateMap)
            .premultiply(this.state.translateCenter)
            .premultiply(scale)
            .premultiply(translateMap);
        let matrixWorldInverse = new THREE.Matrix4();

        matrixWorldInverse.copy(this.world.matrix).invert();

        this.camera.projectionMatrixInverse.copy(this.camera.projectionMatrix).invert();
        this.camera.matrixWorldInverse.copy(this.camera.matrixWorld).invert();

        this.frustum = new THREE.Frustum();
        this.frustum.setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));

        this.cameraPosition = new THREE.Vector3(0, 0, 0).unproject(this.camera).applyMatrix4(matrixWorldInverse);
        this.camera.position.set(0,
            0,
            WORLD_SIZE/ Math.pow(2, this.map.getZoom()) * 5);  // this.cameraPosition.z * 5 //WORLD_SIZE/t.scale * 5

        // this.updateCallback();
    }
    makePerspectiveMatrix(fovy, aspect, near, far) {

        let out = new THREE.Matrix4();
        let f = 1.0 / Math.tan(fovy / 2),
            nf = 1 / (near - far);

        let newMatrix = [
            f / aspect, 0, 0, 0,
            0, f, 0, 0,
            0, 0, (far + near) * nf, -1,
            0, 0, (2 * far * near) * nf, 0
        ];

        out.elements = newMatrix;
        return out;
    }

    static create(map, world) {

        const fov = 36.8;
        const aspect = map.getCanvas().width / map.getCanvas().height;
        const near = 0.001;
        const far = 50000000;
        const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
        return new MapCameraSync(map, camera, world);
    }
}

function initTileset(camera, canvas, url, callback) {
    const tileLoader = new threedtiles.TileLoader({
        maxCachedItems: 1000,
        meshCallback: mesh => {

            // console.log(mesh)
            mesh.visible = false
            mesh.material.wireframe = false;
            mesh.material.side = THREE.DoubleSide;
            //mesh.castShadow = true
            //mesh.receiveShadow = true;
            mesh.geometry.computeVertexNormals();
            //console.log(mesh.material.type)
            //mesh.material.shadowSide = THREE.BackSide;
            mesh.material.flatShading = true;
            mesh.material.needsUpdate = true;
            // mesh.material.metalness = 0.5;
            if (mesh.geometry instanceof THREE.BufferGeometry) {
                const vertices = mesh.geometry.attributes.position.array
                const indices = mesh.geometry.index.array
                const uvs = mesh.geometry.attributes.uv.array
                const normals = mesh.geometry.attributes.normal.array
                const imageBitmap = mesh.material.map.source.data
                // console.log('vertices: ', vertices)
                // console.log('indices: ', indices)
                // console.log('uvs: ', uvs)
                // console.log('normals: ', normals)
                // console.log('imageBitmap: ', imageBitmap)
            }
        //     mesh.material.wireframe = false;
        //     mesh.castShadow = true
        //     mesh.receiveShadow = true;
        //     mesh.geometry.computeVertexNormals();
        //     mesh.material.shadowSide = THREE.BackSide;
        //     mesh.material.flatShading = true;
        //     mesh.material.needsUpdate = true;
        //     mesh.material.metalness = 0.5;
        },
    });

    const ogc3DTile = new threedtiles.OGC3DTile({
        url: url,
        tileLoader: tileLoader,
        yUp: false,
        viewportFunc: () => [canvas.clientWidth, canvas.clientHeight],
        // static: true,
        // centerModel: false,
        // renderer: renderer,
        // onProgressCallback: (e) => {
        //     console.log(e)
        // },
        // onLoadCallback: (e) => {
        //     console.log(e)
        // }
    });
    setIntervalAsync(function () {
        ogc3DTile.update(camera);
    }, 25);//1k / 25 = 40

    return ogc3DTile;
}

function setIntervalAsync(fn, delay) {
    let timeout;

    const run = async () => {
        const startTime = Date.now();
        try {
            await fn();
        } catch (err) {
            console.error(err);
        } finally {
            const endTime = Date.now();
            const elapsedTime = endTime - startTime;
            const nextDelay = elapsedTime >= delay ? 0 : delay - elapsedTime;
            timeout = setTimeout(run, nextDelay);
        }
    };

    timeout = setTimeout(run, delay);

    return { clearInterval: () => clearTimeout(timeout) };
}


function demo_3dtiles(map, tb){
    var world = new THREE.Group();
    world.name = '3dtiles_World';
    tb.scene.add(world);

    const mapCamera = MapCameraSync.create(map, world)

    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263506362/tileset.json";
        const ogc3DTiles1 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles1);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263506363/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }

    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263506372/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263506373/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }

    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524140/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524141/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524142/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524143/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524150/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524151/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524152/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    {
        const url2 = "http://172.21.212.184:8072/taiwan_bridge_webmer/31434152635/3143415263524153/tileset.json";
        const ogc3DTiles2 = initTileset(mapCamera.camera, map.getCanvas(), url2);
        world.add(ogc3DTiles2);
    }
    return {mapCamera, world};
}
