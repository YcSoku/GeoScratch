import { BoundingBox2D } from '../box/boundingBox2D'


export class Node2D {
    parent: Node2D | undefined
    level: number
    id: number
    size: number
    bBox: BoundingBox2D
    children: Node2D[]
    constructor(level: number = 0, id: number = 0, parent?: Node2D) {

        this.parent = parent
        this.level = level
        this.id = id

        this.size = 180. / Math.pow(2, level)

        const childhoodId = this.id % 4
        const minLon = (this.parent ? this.parent.bBox.boundary.x : -180.) + (childhoodId % 2) * this.size
        const maxLon = minLon + this.size
        const minLat = (this.parent ? this.parent.bBox.boundary.y : -90.) + Math.floor((childhoodId / 2)) * this.size
        const maxLat = minLat + this.size

        this.bBox = new BoundingBox2D(
            minLon, minLat,
            maxLon, maxLat
        )

        this.children = []
    }

    release() {

        this.bBox.release()
        // @ts-ignore : release memory
        this.children = null; this.parent = null; this.level = null; this.size = null; this.id = null
        return null
    }


    isSubdividable(options: {
        cameraPos: number[],
        [key: string]: unknown
    }) {

        const center = this.bBox.center
        const hDistance = Math.ceil(Math.abs(center[0] - options.cameraPos[0]) / this.size)
        const vDistance = Math.ceil(Math.abs(center[1] - options.cameraPos[1]) / this.size)
        if (Math.max(hDistance, vDistance) <= 3) return true
        else return false
    }
}