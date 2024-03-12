import { Numeric } from "./numeric.js"
import { vec4 } from "../math/wgpu-matrix.module.js"
import { F32 } from "./f32.js"

export class Vec4f extends Numeric {
     
    constructor(x, y, z, w) {

        if (x === undefined && y === undefined && z === undefined && w === undefined) super('vec4f', vec4.create())
        else if (x !== undefined && y === undefined && z === undefined && w === undefined) super('vec4f', vec4.fromValues(x, x, x, x))
        else if (x !== undefined && y !== undefined && z === undefined && w === undefined) super('vec4f', vec4.fromValues(x, y, y, y))
        else if (x !== undefined && y !== undefined && z !== undefined && w === undefined) super('vec4f', vec4.fromValues(x, y, z, z))
        else super('vec4f', vec4.fromValues(x, y, z, w))
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

    get w() {

        return this._data[3]
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

    set w(w) {

        this._data[3] = w
    }

    static create(x, y, z, w) {

        return new Vec4f(x, y, z, w)
    }

    transformFromMat4(m) {

        this._data = vec4.transformMat4(this._data, m.data)
        return this
    }

    normalize() {

        vec4.normalize(this._data, this._data)
        return this
    }

    scale(s) {

        if (s instanceof Number) vec4.scale(this._data, s, this._data)
        else if (s instanceof F32) vec4.scale(this._data, s.data, this._data)
        
        return this
    }
}

export function vec4f(x, y, z, w) {

    return Vec4f.create(x, y, z, w)
}

export function asVec4f(x, y, z, w) {

    const v = [0., 0., 0., 0.]

    if (x !== undefined && y === undefined && z === undefined && w === undefined) {
        v[0] = x
        v[1] = x
        v[2] = x
        v[3] = x
    }
    else if (x !== undefined && y !== undefined && z === undefined && w === undefined) {
        v[0] = x
        v[1] = y
        v[2] = y
        v[3] = y
    }
    else if (x !== undefined && y !== undefined && z !== undefined && w === undefined) {
        v[0] = x
        v[1] = y
        v[2] = z
        v[3] = z
    }
    else {
        v[0] = x
        v[1] = y
        v[2] = z
        v[3] = w
    }

    return { type: 'vec4f', data: v }
}