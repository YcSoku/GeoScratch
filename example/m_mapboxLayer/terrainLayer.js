import * as scr from '../../src/scratch.js'

export default class TerrainLayer extends scr.LocalTerrain {

    constructor(maxLevel) {

        super(maxLevel)

        this.type = 'custom'
        this.map = undefined
        this.id = 'TerrainLayer'
        this.renderingMode = '3d'
    }

    onAdd(map, gl) {

        this.map = map
        this.setResource(map.dynamicUniformBuffer)
        map.add2PreProcess(this.prePass).add2RenderPass(this.pipeline, this.binding)
    }

    render(gl, matrix) {

        this.registerRenderableNode({
            cameraPos: this.map.mercatorCenter.toLngLat().toArray(),
            cameraBounds: this.map.cameraBounds,
            zoomLevel: this.map.zoom.n,
            uln: this.map.uln,
            brf: this.map.brf,
            nUp: this.map.nUp,
            nFar: this.map.nFar,
            nNear: this.map.nNear,
            nLeft: this.map.nLeft,
            nRight: this.map.nRight,
            nBottom: this.map.nBottom,
            matrix: this.map.uMatrixPure,
            zNear: this.map.near,
            zFar: this.map.far,
            planes: this.map.frustumPlanes
        })
    }
}