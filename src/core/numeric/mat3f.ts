import Numeric from "./numeric";
import { Mat3, mat3 } from 'wgpu-matrix'

export class Mat3f extends Numeric<Mat3> {

    constructor(value?: Mat3) {

        super('mat3x3f', value ? mat3.create(...value) : mat3.identity())
    }

    static create(value?: Mat3) {

        return new Mat3f(value)
    }
}
export function mat3f(value?: Mat3) {

    return Mat3f.create(value)
}