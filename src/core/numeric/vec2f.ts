import Numeric from './numeric'
import { Vec2, vec2 } from 'wgpu-matrix'

export class Vec2f extends Numeric<Vec2> {
    constructor(x: number | undefined, y: number | undefined = x) {
        super(
            'vec2f',
            (x === undefined && y === undefined)
                ? vec2.create()
                : (y === undefined)
                    ? vec2.fromValues(x, x)
                    : vec2.fromValues(x, y)
        );
    }

    static create(x: number | undefined, y: number | undefined) {

        return new Vec2f(x, y);
    }

    get array() {

        return this._data
    }

}

export function vec2f(x: number | undefined, y: number | undefined) {

    return Vec2f.create(x, y)
}

export function asVec2f(x: number | undefined, y: number | undefined) {

    const v = [0, 0]

    if (x !== undefined && y === undefined) {
        v[0] = x
        v[1] = x
    }
    else if (x !== undefined && y !== undefined) {
        v[0] = x
        v[1] = y
    }

    return { type: 'vec2f', data: v }
}