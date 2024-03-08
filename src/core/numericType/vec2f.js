import { Numeric } from "./numeric.js"
import { vec2 } from "../math/wgpu-matrix.module.js"

export class Vec2f extends Numeric {
     
    constructor(x, y) {

        if (x === undefined && y === undefined) super('vec2f', vec2.create())
        else if (x !== undefined && y === undefined ) super('vec2f', vec2.fromValues(x, x))
        else super('vec2f', vec2.fromValues(x, y))
    }

    static create(x, y) {

        return new Vec2f(x, y)
    }

    
}

export function vec2f(x, y) {

    return Vec2f.create(x, y)
}

export function asVec2f(x, y) {

    const v = [0., 0.]

    if (x !== undefined && y === undefined) {
        v[0] = x
        v[1] = x
    }
    else if (x !== undefined && y !== undefined) {
        v[0] = x
        v[1] = y
    }

    return { type: 'vec2f', value: () => v }
}