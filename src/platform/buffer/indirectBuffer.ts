import { ArrayRef } from "../../core/data/arrayRef";
import { Buffer, BufferDescription } from "./buffer";

export interface IndirectResourceDescription {
    arrayRef: ArrayRef;
    size?: number;
    dataOffset?: number;
}

export interface IndirectBufferDescription {
    name: string;
    randomAccessible?: boolean;
    resource: IndirectResourceDescription;
}

export class IndirectBuffer extends Buffer {
    constructor(description: IndirectBufferDescription) {
        let randomAccessible = false;
        let defaultUsage = GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        randomAccessible = description.randomAccessible === undefined ? randomAccessible : description.randomAccessible;
        randomAccessible && (defaultUsage |= GPUBufferUsage.STORAGE);

        const bufferDesc: BufferDescription = {
            name: description.name,
            usage: defaultUsage,
            size: description.resource.arrayRef.value.byteLength
        };
        super(bufferDesc);

        this.registerStrutureMap(description.resource.arrayRef, description.resource.dataOffset, description.resource.size);
    }

    static create(description: IndirectBufferDescription): IndirectBuffer {
        return new IndirectBuffer(description);
    }
}

export function indirectBuffer(description: IndirectBufferDescription): IndirectBuffer {
    return IndirectBuffer.create(description);
}