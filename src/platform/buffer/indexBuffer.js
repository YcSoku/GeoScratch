import { ArrayRef } from "../data/arrayRef.js";
import { Buffer } from "./buffer.js";

/**
 * @typedef {Object} IndexResourceDescription
 * @property {ArrayRef} arrayRef - must be TypedArray
 * @property {number} [size] - in bytes or elements if buffer is a TypedArray
 * @property {number} [dataOffset] - in bytes
 */

/**
 * @typedef {Object} IndexBufferDescription
 * @property {string} name
 * @property {number} [usage]
 * @property {boolean} [randomAccessible]
 * @property {IndexResourceDescription} resource
 */

function parseArrayType(typedArray) {

    if (typedArray instanceof Uint16Array) return 'uint16'
    else if (typedArray instanceof Uint32Array) return 'uint32'
    else return 'Unknown Format'
}

class IndexBuffer extends Buffer {

    /**
     * @param {IndexBufferDescription} description
     */
    constructor(description) {

        let randomAccessible = false
        let defaultUsage =  GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC
        randomAccessible = description.randomAccessible === undefined ? randomAccessible : description.randomAccessible
        randomAccessible && (defaultUsage |= GPUBufferUsage.STORAGE)

        const bufferDesc = {
            name: description.name,
            usage: description.usage ? description.usage : defaultUsage,
            size: description.resource.arrayRef.value.byteLength
        }
        super(bufferDesc)

        this.type = parseArrayType(description.resource.arrayRef.value)

        this.registerStrutureMap(description.resource.arrayRef, description.resource.dataOffset, description.resource.size)
    }

    /**
     * @param {IndexBufferDescription} description 
     */
    static create(description) {

        return new IndexBuffer(description)
    }

    destroy() {

        this.type = null
        super.destroy()
    }
}

export {
    IndexBuffer,
}