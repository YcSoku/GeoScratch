import { Numeric } from "./numeric.js"
import { mat4 as utils } from "../math/wgpu-matrix.module.js"

const BASIC_TYPE_IN_WGSL = 'mat4x4'

export class Mat4 extends Numeric {

    /** @param {import("./numeric.js").DataType} type */
    constructor(type) {

        super(type, utils.identity())
    }

    get type() {

        return BASIC_TYPE_IN_WGSL + this._type
    }

    static create(type) {

        return new Mat4(type)
    }

    static setDefaultComputeType(ctor) {

        utils.setDefaultType(ctor)
    }

    static identity(type) {

        let nm = mat4()
    
        if (type) nm.type = type
        else nm = nm.purify
        
        return nm
    }

    static translation(m, v, type) {

        let nm = mat4().clone(m).translate(v)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static scaling(m, v, type) {

        let nm = mat4().clone(m).scale(v)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static rotationX(m, radius, type) {
        
        let nm = mat4().clone(m).rotateX(radius)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static rotationY(m, radius, type) {
        
        let nm = mat4().clone(m).rotateY(radius)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static rotationZ(m, radius, type) {
        
        let nm = mat4().clone(m).rotateZ(radius)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static transposing(m, type) {
        
        let nm = mat4().clone(m).transpose(radius)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static inverse(m, type) {

        let nm = mat4().invert(m)

        if (type) nm.type = type
        else if (m instanceof Mat4) nm.type = m.type
        else nm = nm.purify()

        return nm
    }

    static multiplication(m1, m2, type) {

        const _m1 = Numeric.purifying(m1)
        const _m2 = Numeric.purifying(m2)
        let m = mat4().clone(utils.multiply(_m1, _m2))

        if (type) m.type = type
        else if (m1._data !== undefined) m.type = m1.type
        else if (m2._data !== undefined) m.type = m2.type
        else m = m.purify()

        return m
    }

    static projection(fov, aspect, near, far, type) {
        
        let m = mat4().perspective(fov, aspect, near, far)
        
        if (type) m.type = type
        else m = m.purify()

        return m
    }

    scale(v) {

        const _v = this.purify(v)

        utils.scale(this._data, _v, this._data)
        return this
    }

    rotateX(radius) {

        const _radius = this.purify(radius)

        utils.rotateX(this._data, _radius, this._data)
        return this
    }

    rotateY(radius) {

        const _radius = this.purify(radius)

        utils.rotateY(this._data, _radius, this._data)
        return this
    }

    rotateZ(radius) {

        const _radius = this.purify(radius)

        utils.rotateZ(this._data, _radius, this._data)
        return this
    }

    lookAt(eye, target, up) {

        const _up = this.purify(up)
        const _eye = this.purify(eye)
        const _target = this.purify(target)

        utils.lookAt(_eye, _target, _up, this._data)
        return this
    }

    transpose(m) {

        const _m = this.purify(m)

        utils.transpose(_m, this._data)
        return this
    }

    invert(m) {

        const _m = this.purify(m)

        utils.invert(_m, this._data)
        return this
    }

    perspective(fov, aspect, near, far) {

        const _fov = this.purify(fov)
        const _far = this.purify(far)
        const _near = this.purify(near)
        const _aspect = this.purify(aspect)

        utils.perspective(_fov, _aspect, _near, _far, this._data)
        return this
    }

    translate(v) {

        const _v = this.purify(v)

        utils.translate(this._data, _v, this._data)
        return this
    }

    multiply(m) {

        const _m = this.purify(m)

        utils.multiply(this._data, _m, this._data)
        return this
    }

    clone(m) {

        const _m = this.purify(m)
        utils.copy(_m, this._data)

        return this
    }
}

export function mat4(type = 'f') {

    return new Mat4(type)
}