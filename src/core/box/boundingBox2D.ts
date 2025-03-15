import { Vec4f, vec4f } from "../numeric/vec4f"

export class BoundingBox2D {

    _boundary: Vec4f
    constructor(xMin?: number, yMin?: number, xMax?: number, yMax?: number) {

        this._boundary = vec4f()
        this._boundary.x = xMin !== undefined ? xMin : Infinity
        this._boundary.y = yMin !== undefined ? yMin : Infinity
        this._boundary.z = xMax !== undefined ? xMax : -Infinity
        this._boundary.w = yMax !== undefined ? yMax : -Infinity
    }

    static create(xMin?: number, yMin?: number, xMax?: number, yMax?: number) {

        return new BoundingBox2D(xMin, yMin, xMax, yMax)
    }

    get boundary() {

        return this._boundary
    }

    update(x: number, y: number) {

        this._boundary.x = x < this._boundary.x ? x : this._boundary.x
        this._boundary.y = y < this._boundary.y ? y : this._boundary.y
        this._boundary.z = x > this._boundary.z ? x : this._boundary.z
        this._boundary.w = y > this._boundary.w ? y : this._boundary.w
    }

    updateByBox(box: BoundingBox2D) {

        this.update(box._boundary.x, box._boundary.y)
        this.update(box._boundary.z, box._boundary.w)
    }

    overlap(bBox: BoundingBox2D) {

        if (this._boundary.x > bBox._boundary.z || this._boundary.z < bBox._boundary.x) return false
        if (this._boundary.y > bBox._boundary.w || this._boundary.w < bBox._boundary.y) return false

        return true
    }

    get center() {

        return [
            (this._boundary.x + this._boundary.z) / 2,
            (this._boundary.y + this._boundary.w) / 2,
        ]
    }

    get size() {

        return [
            this._boundary.z - this._boundary.x,
            this._boundary.w - this._boundary.y,
        ]
    }

    reset(xMin?: number, yMin?: number, xMax?: number, yMax?: number) {

        this._boundary.x = xMin !== undefined ? xMin : Infinity
        this._boundary.y = yMin !== undefined ? yMin : Infinity
        this._boundary.z = xMax !== undefined ? xMax : -Infinity
        this._boundary.w = yMax !== undefined ? yMax : -Infinity
    }

    release() {
        // @ts-ignore : release memory
        this._boundary = null
        return null
    }
}

export function boundingBox2D(xMin?: number, yMin?: number, xMax?: number, yMax?: number) {

    return BoundingBox2D.create(xMin, yMin, xMax, yMax)
}