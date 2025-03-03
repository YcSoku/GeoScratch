import ObservableObject from "../object/observableObject"
import { StorageBuffer } from "../../platform/buffer/storageBuffer"

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
class ArrayRef extends ObservableObject {

    length: number
    private _data: SupportedArrayBufferView

    /**
     * Each ArrayRef maps the `specified range` of the Target-StorageBuffer,
     * which determined by `Global Offset` and `Global Length`
     */
    private targetBuffer: StorageBuffer
    private gOffset: number
    private gLength: number

    constructor(name: string, data: SupportedArrayBufferView) {

        super(name)
        this.length = data.length
        this._data = ensureByteLengthMultipleOfFour(data)
    }

    get value() {

        return this._data
    }

    set value(data) {

        this._data = data
        super.invokeCallbacks(this._data)
    }

    setIndexed(index: number, data: number) {

        this._data[index] = data
        super.invokeCallbacks(this._data)
        return this._data[index]
    }

    getIndexed(index: number) {

        return this._data[index]
    }

    fill(num: number) {

        this._data.fill(num)
        super.invokeCallbacks(this._data)
    }

    element(index: number, data?: number) {

        if (data === undefined) return this.getIndexed(index)
        return this.setIndexed(index, data)
    }

    destroy(): void {
        // @ts-ignore
        this._data = null;

        super.destroy()
    }
}

function aRef(typedArray: SupportedArrayBufferView, name: string = 'arrayRef') {
    return new ArrayRef(name, typedArray)
}

export {
    ArrayRef, aRef
}


