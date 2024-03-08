import { Numeric } from "./numeric.js"

export class F32 extends Numeric {

    constructor(a) {

        if (a === undefined) super('f32', 0)
        else super('f32', a)
    }

    static create(a) {

        return new F32(a)
    }

    add(a) {

        this._data += a
        return this
    }
}

export function f32(a) {

    return F32.create(a)
}

export function asF32(a) {

    return { type: 'f32', value: () => a }
}