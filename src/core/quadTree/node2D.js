import { BoundingBox2D } from '../box/boundingBox2D.js'

/**
 * @typedef {object} MapOptions
 * @property {BoundingBox2D} cameraBounds
 * @property {Array[number]} cameraPos
 * @property {number} zoomLevel
 */

export class Node2D {

    /**
     * @param {number} level 
     * @param {number} id 
     * @param {Node2D} [parent]
     */
    constructor(level = 0, id = 0, parent = undefined) {

        this.parent = parent
        this.level = level
        this.id = id

        this.size = 180.0 / Math.pow(2, level)

        const subId = this.id % 4
        const minLon = (this.parent ? this.parent.bBox.boundary.x : 0.0) + (subId % 2) * this.size
        const maxLon = minLon + this.size
        const minLat = (this.parent ? this.parent.bBox.boundary.y : -90.0) + Math.floor((subId / 2)) * this.size
        const maxLat = minLat + this.size

        this.bBox = new BoundingBox2D(
            minLon, minLat,
            maxLon, maxLat
        )

        /**
         * @type {Node2D[]}
         */
        this.children = []
    }

    release() {
        
        this.bBox = this.bBox.release()
        this.children = null
        this.parent = null
        this.level = null
        this.size = null
        this.id = null
    }

    /**
     * @param {MapOptions} options
     * @returns 
     */
    isSubdividable(options) {

        const center = this.bBox.center

        const hFactor = Math.ceil(Math.abs(center[0] - options.cameraPos[0]) / this.size)
        const vFactor = Math.ceil(Math.abs(center[1] - options.cameraPos[1]) / this.size)
        const distance = Math.max(hFactor, vFactor)
        if (distance <= 2) return true
        else return false
    }
}