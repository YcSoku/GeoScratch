import { Numeric } from "./numeric.js"
import { vec3 as utils } from "../math/wgpu-matrix.module.js"

const BASIC_TYPE_IN_WGSL = 'vec3'

export class Vec3 extends Numeric {
     
    constructor(type, x, y, z) {

        if (x === undefined && y === undefined && z === undefined) super(type, utils.create())
        else if (x !== undefined && y === undefined && z === undefined ) super(type, utils.fromValues(x, x, x))
        else if (x !== undefined && y !== undefined && z === undefined ) super(type, utils.fromValues(x, y, y))
        else super(type, utils.fromValues(x, y, z))
    }

    get type() {

        return BASIC_TYPE_IN_WGSL + this._type
    }

    static create(type, x, y, z) {

        return new Vec3(type, x, y, z)
    }

    static setDefaultComputeType(ctor) {

        utils.setDefaultType(ctor)
    }

    static fromValues(x, y, z, type) {

        return type === undefined ? [x, y, z] : new Vec3(type, x, y, z)
    }

    static crossing(v1, v2, type) {

        let nv = vec3().clone(v1).cross(v2)

        if (type) nv.type = type
        else if (v1._data !== undefined) nv.type = m1.type
        else if (v2._data !== undefined) nv.type = m2.type
        else nv = nv.purify()

        return nv
    }

    static subtraction(v1, v2, type) {

        let nv = vec3().clone(v1).subtract(v2)

        if (type) nv.type = type
        else if (v1._data !== undefined) nv.type = m1.type
        else if (v2._data !== undefined) nv.type = m2.type
        else nv = nv.purify()

        return nv
    }

    get x() {

        return this._data[0]
    }

    get y() {

        return this._data[1]
    }

    get z() {

        return this._data[2]
    }

    get xy() {

        return [ this._data[0], this._data[1] ]
    }

    get yz() {

        return [ this._data[1], this._data[2] ]
    }

    get xyz() {

        return [ this._data[0], this._data[1], this._data[2] ]
    }

    set x(x) {

        this._data[0] = x
    }

    set y(y) {

        this._data[1] = y
    }

    set z(z) {

        this._data[2] = z
    }

    set xy(xy) {

        this._data[0] = xy[0]
        this._data[1] = xy[1]
    }

    set yz(yz) {

        this._data[1] = yz[0]
        this._data[2] = yz[1]
    }

    set xyz(xyz) {

        this._data[0] = xyz[0]
        this._data[1] = xyz[1]
        this._data[2] = xyz[2]
    }

    transformFromMat4(m) {

        const _m = this.purify(m)
        this._data = utils.transformMat4(this._data, _m)

        return this
    }

    normalize() {

        utils.normalize(this._data, this._data)

        return this
    }

    scale(s) {

        const _s = this.purify(s)
        utils.scale(this._data, _s, this._data)
        
        return this
    }

    subtract(v) {

        const _v = this.purify(v)
        utils.subtract(this._data, _v, this._data)

        return this
    }

    dot(v) {

        const _v = this.purify(v)
        return utils.dot(this._data, _v)
    }

    cross(v) {

        const _v = this.purify(v)
        utils.cross(this._data, _v, this._data)

        return this
    }

    clone(v) {

        const _v = this.purify(v)
        utils.copy(_v, this._data)

        return this
    }
}

export function vec3(type, x, y, z) {

    const _type = type === undefined ? 'f' : type

    return Vec3.create(_type, x, y, z)
}