import { ArrayRef } from "../../core/data/arrayRef";
import { Buffer } from "./buffer";
import { MapBuffer } from "./mapBuffer";
import { ElementType, TypeBytes } from "./util";
import { device } from "../context/singletonDevice";

type StorageBufferDescription = {
    name: string,
    usage: GPUBufferUsageFlags,
    resource: { size?: number; arrayRefs?: Array<ArrayRef> },
    willMap?: boolean
}

class StorageBuffer extends Buffer {

    private mapBuffer?: MapBuffer
    willMap: boolean
    constructor(description: StorageBufferDescription) {

        // Create buffer
        let size: number // in bytes
        if (description.resource.size) size = description.resource.size
        else size = description.resource.arrayRefs!.reduce((acc, cur) => acc + cur.value.byteLength, 0)
        const baseBufferDesc = {
            name: description.name,
            usage: description.usage ?? (GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC),
            size: size
        }
        super(baseBufferDesc)

        // Properties
        this.willMap = description.willMap ?? false

        if (description.willMap) {
            this.mapBuffer = MapBuffer.create({
                name: description.name + ' <map-buffer>',
                mapTarget: this
            })
        }

        // Register structure map from ArrayRefs
        if (description.resource.arrayRefs) {
            description.resource.arrayRefs.forEach(ar => {
                this.registerStrutureMap(ar, 0, ar.value.byteLength, 1)
            })
        }
    }

    static create(description: StorageBufferDescription): StorageBuffer {
        return new StorageBuffer(description)
    }

    registerMapRange(offset: number, size: number, elementType: ElementType) {

        if (size < this.size || offset + size > this.size || offset < 0 || size < 0) {
            console.error("Invalide mappinrg range.");
        }

        return {
            "W": (localOffset: number, localSize: number, data: ArrayBufferView) => {

                // localOffset + localSize / TypeBytes[elementType] in range [ 0 , size ]
                if (size < localOffset || localOffset + localSize / TypeBytes[elementType] > size || localOffset < 0 || localSize < 0) {
                    console.error(new Error("Invalide mappinrg range."));
                }
                this._writeBuffer(offset + localOffset, localSize, data.buffer)
            },
            "R": async (localOffset: number, localSize: number, elementType: ElementType) => {

                // localOffset + localSize / TypeBytes[elementType] in range [ 0 , size ]
                if (size < localOffset || localOffset + localSize / TypeBytes[elementType] > size || localOffset < 0 || localSize < 0) {
                    console.error(new Error("Invalide mappinrg range."));
                }
                await this._readBuffer(offset + localOffset, localSize, elementType)
            }
        }
    }

    private _writeBuffer(offset: number, size: number, data: ArrayBuffer) {

        const gpuDevice = device.gpuDevice
        gpuDevice.queue.writeBuffer(this.buffer, offset, data, 0, size)
    }

    private async _readBuffer(offset: number, size: number, elementType: ElementType): Promise<ArrayBufferView> {

        if (!this.willMap) console.error('StorageBuffer is not mapped. <willMap === false>')
        return this.mapBuffer!.mapRead(offset, size, elementType)
    }

    destroy() {

        //@ts-ignore
        this.willMap = undefined
        this.mapBuffer = undefined
        super.destroy()
    }
}


function storageBuffer(description: StorageBufferDescription) {

    return StorageBuffer.create(description)
}

export {
    storageBuffer,
    StorageBuffer
}