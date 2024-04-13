import * as scr from '../../src/scratch.js'
import { Threebox } from 'threebox-plugin'
import * as THREE from 'three'

const unityCanvas = document.createElement('canvas')
unityCanvas.id = 'UnityCanvas'
unityCanvas.style.zIndex = '2'
unityCanvas.style.width = '100%'
unityCanvas.style.height = '100%'
unityCanvas.style.border = 'none'
unityCanvas.style.position = 'absolute'
unityCanvas.style.pointerEvents = 'none'
unityCanvas.style.background = 'transparent'
document.body.appendChild(unityCanvas)

export default class UnityLayer{

    constructor(originPosition, visibleZoom) {

        this.type = 'custom'
        this.id = 'UnityLayer'
        this.renderingMode = '3d'
        this.unityProjName = 'output'
        this.visibleZoom = visibleZoom
        this.originPosition = originPosition

        this.tb = undefined
        this.map = undefined
        this.zoom = undefined
        this.unity = undefined
        this.originPoint = undefined
        this.dispatchMessage = undefined

        // Get Unity canvas
        this.unityCanvas = unityCanvas
        unityCanvas.style.width = unityCanvas.clientWidth
        unityCanvas.style.height = unityCanvas.clientHeight
    }

    onAdd(map, gl) {

        // Set Unity instance configuration
        const buildUrl = "/unity/collapseBank/build"
        const config = {
            frameworkUrl: buildUrl + `/${this.unityProjName}.framework.js`,
            dataUrl: buildUrl + `/${this.unityProjName}.data`,
            codeUrl: buildUrl + `/${this.unityProjName}.wasm`,
            streamingAssetsUrl: "StreamingAssets",
            companyName: "DefaultCompany",
            productVersion: "0.1",
            productName: "0325",
            webglContextAttributes: {
                "alpha": true
            }
        }

        // Init map
        this.map = map
        this.zoom = this.map.getZoom()
        this.map.on('click', e => {

            if (this.zoom >= this.visibleZoom) this.pick(e.point.x, e.point.y)
        })
        
        // Init threebox
        this.tb = new Threebox(
            map,
            map.getCanvas().getContext('webgl2'),
            {}
        )
        
        // Set origin point
        this.originPoint = this.tb.projectToWorld(this.originPosition)

        // Init Unity insatnce
        createUnityInstance(this.unityCanvas, config, (progress) => {
        
        }).then((unityInstance) => {

            this.unity = unityInstance

            this.dispatchMessage = (message) => {

                this.unity.SendMessage("MapCamera", "DispatchMessage", JSON.stringify(message))
            }

            this.init()
            this.keep(this.zoom >= this.visibleZoom)

        }).catch((message) => {

            alert(message)
        })
    }

    render(gl, matrix) {

        if (!this.unity) return

        // Render or not
        const currentZoom = this.map.getZoom()
        if (this.zoom < this.visibleZoom && currentZoom >= this.visibleZoom) {

            this.keep(true)
        }
        else if (this.zoom >= this.visibleZoom && currentZoom < this.visibleZoom) {

            this.keep(false)
            this.clear()
        }
        this.zoom = currentZoom

        // Tick logic
        if (this.zoom >= this.visibleZoom) {

            this.tb.update()
            this.tick()
        }
    }

    // Unity interfaces
    init() {

        this.dispatchMessage({
            Method: 'Init'
        })
    }

    pick(x, y) {

        this.dispatchMessage({
            Method: 'Pick',
            F32Array: [
                2.0 * x / this.unityCanvas.clientWidth - 1.0,
                2.0 * (this.unityCanvas.clientHeight - y) / this.unityCanvas.clientHeight - 1.0
            ]
        })
    }

    tick() {

        const flip = new THREE.Matrix4().set(
            -1.0, 0.0, 0.0, 0.0,
            0.0, 0.0, -1.0, 0.0,
            0.0, 1.0, 0.0, 0.0,
            0.0, 0.0, 0.0, 1.0,
        )
        const model = this.tb.world.matrixWorld.multiply(new THREE.Matrix4().makeTranslation(this.originPoint.x, this.originPoint.y, this.originPoint.z))
        const view = new THREE.Matrix4().copy(this.tb.camera.matrixWorldInverse)
        const projection = new THREE.Matrix4().copy(this.tb.camera.projectionMatrix)
        const mvp = projection.multiply(view).multiply(model).multiply(flip)

        this.dispatchMessage({
            Method: 'Tick',
            F32Array: mvp.elements
        })
    }

    keep(tof) {

        this.unityCanvas.style.visibility = tof ? 'visible' : 'hidden'

        this.dispatchMessage({
            Method: 'Keep',
            BoolArray: [ tof ]
        })
    }

    clear() {

        const gl = this.unity.Module.ctx
        gl.clear(gl.DEPTH_BUFFER_BIT | gl.COLOR_BUFFER_BIT)
        gl.clearColor(0.0, 0.0, 0.0, 0.0)
    }
}

// Helpers //////////////////////////////////////////////////////////////////////////////////////////////////////

// {
//     // Used used Matrix Rotation
//     const zFlipMatrix = new THREE.Matrix4().makeScale(1, 1, -1)
//     const rotationZ = new THREE.Matrix4().makeRotationZ(Math.PI)
//     const rotationX = new THREE.Matrix4().makeRotationX(Math.PI / 2)
//     const rotationMatrix = new THREE.Matrix4().multiplyMatrices(rotationX, rotationZ)
//     mvp.multiply(zFlipMatrix).multiply(rotationMatrix)
// }