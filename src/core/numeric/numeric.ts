export interface NumericInterface {
    data: unknown,
    type: string
}

export default class Numeric<T> implements NumericInterface {

    _type: string
    _data: T
    constructor(type: string, data: T) {
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