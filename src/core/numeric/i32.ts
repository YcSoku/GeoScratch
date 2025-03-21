import Numeric from "./numeric"

type _I32 = number

export class I32 extends Numeric<_I32> {
    constructor(a?: _I32) {

        if (a === undefined) super('i32', 0)
        else super('i32', a)
    }

    static create(a?: _I32) {

        return new I32(a)
    }

    // add(a: I32) {

    //     this.data = this.data + a.data
    //     return this
    // }
}

export function i32(a?: _I32) {

    return I32.create(a)
}

export function asI32(a: number) {

    return { type: 'i32', data: a !== undefined ? a : 0 }
}