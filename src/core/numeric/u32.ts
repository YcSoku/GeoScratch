import Numeric from "./numeric"

type _U32 = number

export class U32 extends Numeric<_U32> {
    constructor(a: _U32) {

        if (a === undefined) super('u32', 0)
        else super('u32', a)
    }

    static create(a: _U32) {

        return new U32(a)
    }

    set n(a: _U32) {

        this._data = a
    }

    get n() {

        return this._data
    }

    add(a: _U32) {

        this._data += a
        return this
    }
}

export function u32(a: _U32) {

    return U32.create(a)
}

export function asU32(a: number) {

    return { type: 'u32', data: a !== undefined ? a : 0 }
}