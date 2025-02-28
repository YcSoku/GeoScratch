export interface NumericInterface {
    data: unknown,
    type: NumericType
}
export type NumericType = 'f32' | 'i32' | 'u32' | 'vec2f' | 'vec2i' | 'vec2u' | 'vec3f' | 'vec3i' | 'vec3u' | 'vec4f' | 'mat4x4f'


export default class Numeric<T> implements NumericInterface {

    _type: NumericType
    _data: T
    constructor(type: NumericType, data: T) {
        this._type = type
        this._data = data
    }

    set data(value: T) {
        this._data = value
    }

    get data() {
        return this._data
    }

    get type() {
        return this._type
    }
}