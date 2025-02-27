import Numeric from "./numeric"

type _F32 = number

export class F32 extends Numeric<_F32> {
    constructor(a: _F32) {

        if (a === undefined) super('f32', 0)
        else super('f32', a)
    }

    static create(a: _F32) {
        return new F32(a)
    }

    add(a: F32) {
        return new F32(this.data + a.data)
    }

    set n(a: _F32) {
        this.data = a
    }
}

export function f32(a: number) {
    return F32.create(a)
}

export function asF32(a: number) {
    return { type: 'f32', data: a !== undefined ? a : 0 }
}