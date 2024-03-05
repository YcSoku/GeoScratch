import { ArrayRef } from "../data/arrayRef.js";
import { Buffer } from "./buffer.js";
import { IndexBuffer } from "./indexBuffer.js";
import { IndirectBuffer } from "./indirectBuffer.js";
import { VertexBuffer } from "./vertexBuffer.js";

/**
 * @typedef {Object} StorageResourceDescription
 * @property {ArrayRef} arrayRef - must be TypedArray
 * @property {number} [size] - in bytes or elements if buffer is a TypedArray
 * @property {number} [dataOffset] - in bytes
 * @property {number} [components]
 */

/**
 * @typedef {Object} StorageBufferDescription
 * @property {string} name
 * @property {number} [usage]
 * @property {StorageResourceDescription} resource
 */

class StorageBuffer extends Buffer {

    /**
     * @param {StorageBufferDescription} [bufferDesc] 
     */
    constructor(bufferDesc) {

        super(bufferDesc)
        this.componetsPerElement = 0
    }

    /**
     * @param {StorageBufferDescription} description 
     */
    static create(description) {

        /**
         *  @type {import("./buffer.js").BufferDescription}
         */
        const bufferDesc = {
            name: description.name,
            usage: description.usage ? description.usage : (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC),
            size: description.resource.arrayRef.value.byteLength
        }

        const storageBuffer = new StorageBuffer(bufferDesc)

        storageBuffer.componetsPerElement = description.resource.components ? description.resource.components : 0

        storageBuffer.registerStrutureMap(description.resource.arrayRef, description.resource.dataOffset, description.resource.size)

        return storageBuffer
    }

    /**
     * 
     * @param {VertexBuffer} vertexBuffer 
     * @returns 
     */
    static fromVertexBuffer(vertexBuffer) {

        const storageBuffer = new StorageBuffer()

        storageBuffer.name = `Storage buffer from ${vertexBuffer.name}`
        storageBuffer.buffer = vertexBuffer.buffer
        storageBuffer.areaMap = vertexBuffer.areaMap
        storageBuffer.lastAreaName = vertexBuffer.lastAreaName
        storageBuffer.componetsPerElement = vertexBuffer.getComponentsPerElement()

        return storageBuffer 
    }

    /**
     * 
     * @param {IndexBuffer} indexBuffer 
     * @returns 
     */
    static fromIndexBuffer(indexBuffer) {

        const storageBuffer = new StorageBuffer()

        storageBuffer.name = `Storage buffer from ${indexBuffer.name}`
        storageBuffer.buffer = indexBuffer.buffer
        storageBuffer.areaMap = indexBuffer.areaMap
        storageBuffer.lastAreaName = indexBuffer.lastAreaName
        storageBuffer.componetsPerElement = 1

        return storageBuffer 
    }

    /**
     * 
     * @param {IndirectBuffer} indirectBuffer 
     * @returns 
     */
    static fromIndirectBuffer(indirectBuffer) {

        const storageBuffer = new StorageBuffer()

        storageBuffer.name = `Storage buffer from ${indirectBuffer.name}`
        storageBuffer.buffer = indirectBuffer.buffer
        storageBuffer.areaMap = indirectBuffer.areaMap
        storageBuffer.lastAreaName = indirectBuffer.lastAreaName
        storageBuffer.componetsPerElement = 1

        return storageBuffer 
    }

    destroy() {

        this.componetsPerElement = null
        super.destroy()
    }
}

export {
    StorageBuffer,
}