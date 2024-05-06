import { BoundingBox2D } from '../box/boundingBox2D.js'
import { MercatorCoordinate } from '../geo/mercatorCoordinate.js'
import { Mat4 } from '../numericType/mat4.js'
import { Vec3f, vec3f } from '../numericType/vec3f.js'
import { Vec4f, vec4f } from '../numericType/vec4f.js'

/**
 * @typedef {object} MapOptions
 * @property {BoundingBox2D} cameraBounds
 * @property {Array[number]} cameraPos
 * @property {number} zoomLevel
 * @property {Vec3f} uln
 * @property {Vec3f} brf
 * @property {Vec3f} nUp
 * @property {Vec3f} nFar
 * @property {Vec3f} nNear
 * @property {Vec3f} nLeft
 * @property {Vec3f} nRight
 * @property {Vec3f} nBottom
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

        this.size = 180. / Math.pow(2, level)

        const childhoodId = this.id % 4
        const minLon = (this.parent ? this.parent.bBox.boundary.x : -180.) + (childhoodId % 2) * this.size
        const maxLon = minLon + this.size
        const minLat = (this.parent ? this.parent.bBox.boundary.y : -90.) + Math.floor((childhoodId / 2)) * this.size
        const maxLat = minLat + this.size

        /** @type {BoundingBox2D} */ 
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
        return null
    }

    /**
     * @param {MapOptions} options
     * @returns {boolean}
     */
    isSubdividable(options) {

        const center = this.bBox.center
        const hDistance = Math.ceil(Math.abs(center[0] - options.cameraPos[0]) / this.size)
        const vDistance = Math.ceil(Math.abs(center[1] - options.cameraPos[1]) / this.size)

        if (Math.max(hDistance, vDistance) <= 1) return true
        else return false
    }

    /**
     * @param {MapOptions} options
     * @returns {boolean}
     */
    isVisible(options) {
        
        // const paddingX = (this.bBox.xMax - this.bBox.xMin) / 1
        // const paddingY = (this.bBox.yMax - this.bBox.yMin) / 1
        const paddingX = 0
        const paddingY = 0
        const xMin = MercatorCoordinate.mercatorXfromLon(this.bBox.xMin - paddingX)
        const yMin = MercatorCoordinate.mercatorYfromLat(this.bBox.yMin - paddingY)
        const xMax = MercatorCoordinate.mercatorXfromLon(this.bBox.xMax + paddingX)
        const yMax = MercatorCoordinate.mercatorYfromLat(this.bBox.yMax + paddingY)

        const vertices = [
            { x: xMin, y: yMin },
            { x: xMax, y: yMin },
            { x: xMin, y: yMax },
            { x: xMax, y: yMax },
        ]

        const edges = [
            [ vertices[0], vertices[1] ],
            [ vertices[1], vertices[3] ],
            [ vertices[3], vertices[2] ],
            [ vertices[2], vertices[0] ],
        ]

        const planes = options.planes

        return isAABBVisible(vertices, edges, planes)

        /**
         * @param {[ { x: number, y: number } ]} vertices 
         * @param {[ [] ]} edges 
         * @param {[ { point: Vec3f, normal: Vec3f } ]} planes 
         * @returns {boolean}
         */
        function isAABBVisible(vertices, edges, planes) {

            let intersectionCount = 0
            for (const plane of planes) {

                let allOut = true
                let countInside = 0

                for (const vertex of vertices) {
                    if (!isVertexOutsidePlane(vertex, plane)) {

                        countInside++
                        allOut = false
                    }
                }

                // if (countInside === vertices.length) {
                //     intersectionCount++
                // }

                if (allOut) return false
            }

            // if (intersectionCount > 0) return true

            for (const plane of planes) {

                const intersects = edges.some(edge => checkEdgePlaneIntersection(edge, plane))
                if (intersects) return true
            }

            return true
        }

        /**
         * @param {{ x: number, y: number }} vertex 
         * @param {{ point: Vec3f, normal: Vec3f, distance: number }} plane 
         * @returns {number}
         */
        function isVertexOutsidePlane(vertex, plane) {

            const d = (vertex.x * plane.normal.x + vertex.y * plane.normal.y) + plane.distance
            return d < 0
        }

        /**
         * @param {[]} edge 
         * @param {{ point: Vec3f, normal: Vec3f, distance: number }} plane 
         * @returns {boolean}
         */
        function checkEdgePlaneIntersection(edge, plane) {

            const start = isVertexOutsidePlane(edge[0], plane)
            const end = isVertexOutsidePlane(edge[1], plane)

            return start !== end
        }
    }
}


// const points = [
//     vec3f(xMin, yMin, 0.),
//     vec3f(xMax, yMin, 0.),
//     vec3f(xMin, yMax, 0.),
//     vec3f(xMax, yMax, 0.),
// ]

// const edges = [
//     [ points[0], points[1] ],
//     [ points[1], points[3] ],
//     [ points[3], points[2] ],
//     [ points[2], points[0] ],
// ]

// const planes = [
//     { point: options.uln, normal: options.nUp },
//     { point: options.brf, normal: options.nFar },
//     { point: options.uln, normal: options.nNear },
//     { point: options.uln, normal: options.nLeft },
//     { point: options.brf, normal: options.nRight },
//     { point: options.brf, normal: options.nBottom },
// ]

// let outOfPlaneCounts = new Array(planes.length).fill(0)

// points.forEach(point => {
//     planes.forEach((plane, index) => {
//         if (distance(point, plane.point, plane.normal) < 0) outOfPlaneCounts[index]++
//     })
// })

// // for (const edge of edges) {

// //     if (planes.some(plane => intersects(edge[0], edge[1], plane.point, plane.normal))) {
// //         return true
// //     }
// // }

// if (outOfPlaneCounts.some(count => count === 4)) {
//     return false
// }
// return true
// if (outOfPlaneCounts.every(count => count > 0)) return true
// console.log('?')
// return false

// /**
//  * 
//  * @param {Vec3f} v1 
//  * @param {Vec3f} v2 
//  * @param {Vec3f} n 
//  * @returns {number}
//  */
// function distance(v1, v2, n) {

//     return Vec3f.Subtract(v1, v2).dot(n)
// }

// /**
//  * 
//  * @param {Vec3f} start 
//  * @param {Vec3f} end 
//  * @param {Vec3f} point 
//  * @param {Vec3f} normal 
//  */
// function intersects(start, end, point, normal) {

//     let startDist = Vec3f.Subtract(start, point).dot(normal)
//     let endDist = Vec3f.Subtract(end, point).dot(normal)
//     return startDist * endDist <= 0
// }

// const points = [
//     vec4f(xMin, yMin, 0., 1.),
//     vec4f(xMax, yMin, 0., 1.),
//     vec4f(xMin, yMax, 0., 1.),
//     vec4f(xMax, yMax, 0., 1.),
// ]

// const tl_NDC = getNDC(points[0], options.matrix)
// const tr_NDC = getNDC(points[1], options.matrix)
// const bl_NDC = getNDC(points[2], options.matrix)
// const br_NDC = getNDC(points[3], options.matrix)

// // console.log(tl_NDC, tr_NDC, bl_NDC, br_NDC)
// const minX_NDC = Math.min(tl_NDC[0], bl_NDC[0], tr_NDC[0], br_NDC[0])
// const minY_NDC = Math.min(tl_NDC[1], bl_NDC[1], tr_NDC[1], br_NDC[1])
// const maxX_NDC = Math.max(tl_NDC[0], bl_NDC[0], tr_NDC[0], br_NDC[0])
// const maxY_NDC = Math.max(tl_NDC[1], bl_NDC[1], tr_NDC[1], br_NDC[1])
// // const minY_NDC = Math.min(bl_NDC[1], br_NDC[1])
// // const maxX_NDC = Math.max(tr_NDC[0], br_NDC[0])
// // const maxY_NDC = Math.max(tl_NDC[1], tr_NDC[1])
// console.log(minX_NDC, minY_NDC, maxX_NDC, maxY_NDC)

// if (maxX_NDC < -1.0 || maxY_NDC < -1.0 || minX_NDC > 1.0 || minY_NDC > 1.0) return false
// return true

// function getNDC(p, matrix) {

//     p.transformFromMat4(matrix)
//     p.x /= p.w
//     p.y /= p.w
//     p.z /= p.w
//     p.w /= p.w
//     return p.array
// }