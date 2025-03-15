import Numeric from './numeric'
import { Vec2, vec2 } from 'wgpu-matrix'

export class Vec2i extends Numeric<Vec2> {
    constructor(x: number | undefined, y: number | undefined = x) {
        super(
            'vec2i',
            (x === undefined && y === undefined)
                ? vec2.create()
                : (y === undefined)
                    ? vec2.fromValues(x, x)
                    : vec2.fromValues(x, y)
        );
    }

    static create(x: number | undefined, y: number | undefined) {

        return new Vec2i(x, y);
    }

    get x() {

        return this._data[0]
    }
    set x(x) {

        this._data[0] = x
    }

    get y() {

        return this._data[1]
    }

    set y(y) {

        this._data[1] = y
    }
}

export function vec2i(x?: number, y?: number) {

    return Vec2i.create(x, y)
}

export function asVec2i(x?: number, y?: number) {

    const v = [0, 0]

    if (x !== undefined && y === undefined) {
        v[0] = x
        v[1] = x
    }
    else if (x !== undefined && y !== undefined) {
        v[0] = x
        v[1] = y
    }

    return { type: 'vec2i', data: v }
}