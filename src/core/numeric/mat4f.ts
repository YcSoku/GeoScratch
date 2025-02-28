import Numeric from "./numeric";
import { Mat4, mat4 } from 'wgpu-matrix'

export class Mat4f extends Numeric<Mat4> {

    constructor(value?: Mat4) {

        super('mat4x4f', value ? mat4.create(...value) : mat4.identity())
    }

    static create(value?: Mat4) {

        return new Mat4f(value)
    }
}
export function mat4f(value?: Mat4) {

    return Mat4f.create(value)
}