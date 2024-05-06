export class Numeric {

    constructor(type, data) {

        this._type = type
        this._data = data
    }

    /**
     * @param {any} value
     */
    set data(value) {

        this._data = value
    }

    get data() {

        return this._data
    }

    get type() {

        return this._type
    }

    set type(type) {

        this._type = type
    }

    static purifying(data) {
        
        return data._data !== undefined ? data._data : data
    }

    purify(data) {

        if (data !== undefined) return data._data !== undefined ? data._data : data
        return this._data
    }
}