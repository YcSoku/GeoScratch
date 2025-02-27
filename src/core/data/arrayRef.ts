import { UUID } from "../util/uuid"
import ScratchObject from "../object/object"

////// Helper ////////////////////////////////
type SupportedArrayBufferView = Uint8Array | Uint16Array | Uint32Array | Float32Array
type SupportedArrayBufferConstructor = Uint8ArrayConstructor | Uint16ArrayConstructor | Uint32ArrayConstructor | Float32ArrayConstructor
function createTypedArray(
    constructor: SupportedArrayBufferConstructor,
    length: number) {
    switch (constructor) {
        case Uint8Array:
            return new Uint8Array(length)
        case Uint16Array:
            return new Uint16Array(length / 2)
        case Uint32Array:
            return new Uint32Array(length / 4)
        case Float32Array:
            return new Float32Array(length / 4)
        default:
            throw new Error('Unsupported data type')
    }
}
function ensureByteLengthMultipleOfFour(data: SupportedArrayBufferView) {

    let byteLength = data.byteLength
    let bytesNeeded = (4 - (byteLength % 4)) % 4

    if (bytesNeeded > 0) {
        let paddedArray = createTypedArray(data.constructor as SupportedArrayBufferConstructor, byteLength + bytesNeeded)
        for (let i = 0; i < data.length; i++) {
            paddedArray[i] = data[i]
        }
        return paddedArray
    }

    return data
}






////// ArrayRef ////////////////////////////////
type AnyCallBack = (...args: any[]) => any

class ArrayRef extends ScratchObject {

    length: number
    private _data: SupportedArrayBufferView

    structure: unknown[]
    stride: number
    onChanges: Array<AnyCallBack | null>

    constructor(name: string, data: SupportedArrayBufferView) {

        super(name)
        this.length = data.length
        this._data = ensureByteLengthMultipleOfFour(data)
        this.onChanges = []
        this.structure = []
        this.stride = 0
    }

    get value() {

        return this._data
    }

    set value(data) {

        this._data = data
        this.onChanges.forEach(callback => callback && callback())
    }

    setIndexed(index: number, data: number) {

        this._data[index] = data
        this.onChanges.forEach(callback => callback && callback())
    }

    getIndexed(index: number) {

        return this._data[index]
    }


    fill(num: number) {

        this._data.fill(num)
        this.onChanges.forEach(callback => callback && callback())
    }

    element(index: number, data?: number) {

        if (data === undefined) return this.getIndexed(index)
        return this.setIndexed(index, data)
    }

    registerCallback(callback: AnyCallBack) {

        this.onChanges.push(callback)
        return this.onChanges.length - 1
    }

    removeCallback(indexOrFunction: number | AnyCallBack) {

        if (typeof indexOrFunction === 'number') {
            this.onChanges[indexOrFunction] = null
        } else {
            const index = this.onChanges.indexOf(indexOrFunction)
            if (index === -1) {
                throw 'Callback not registered ' + indexOrFunction.toString()
            }
            this.onChanges[index] = null
        }
    }

    destroy(): void {
        super.destroy()
        this.onChanges = []
        this.structure = []
        // @ts-ignore
        this._data = null; this.stride = null
    }
}

function aRef(typedArray: SupportedArrayBufferView, name: string = 'arrayRef') {
    return new ArrayRef(name, typedArray)
}





export {
    ArrayRef, aRef
}


