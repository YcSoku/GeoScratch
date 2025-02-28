import Numeric from "./numeric";
import { Vec3, vec3 } from "wgpu-matrix";

export class Vec3f extends Numeric<Vec3> {

    constructor(x?: number, y?: number, z?: number) {

        if (x === undefined && y === undefined && z === undefined) super('vec3f', vec3.create())
        else if (x !== undefined && y === undefined && z === undefined) super('vec3f', vec3.fromValues(x, x, x))
        else if (x !== undefined && y !== undefined && z === undefined) super('vec3f', vec3.fromValues(x, y, y))
        else super('vec3f', vec3.fromValues(x, y, z))
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

    set x(x) {

        this._data[0] = x
    }

    set y(y) {

        this._data[1] = y
    }

    set z(z) {

        this._data[2] = z
    }

    static create(x?: number, y?: number, z?: number) {

        return new Vec3f(x, y, z)
    }

}

export function vec3f(x?: number, y?: number, z?: number) {

    return Vec3f.create(x, y, z)
}

export function asVec3f(x?: number, y?: number, z?: number) {

    const v = [0., 0., 0.]

    if (x !== undefined && y === undefined && z === undefined) {
        v[0] = x
        v[1] = x
        v[2] = x
    }
    else if (x !== undefined && y !== undefined && z === undefined) {
        v[0] = x
        v[1] = y
        v[2] = y
    }
    else if (x !== undefined && y !== undefined && z !== undefined) {
        v[0] = x
        v[1] = y
        v[2] = z
    }

    return { type: 'vec3f', data: v }
}