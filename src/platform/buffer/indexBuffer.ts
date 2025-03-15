import { TypedArray } from "webgpu-utils";
import { ArrayRef } from "../../core/data/arrayRef";
import { Buffer } from "./buffer";

export interface IndexResourceDescription {
    arrayRef: ArrayRef;
    size?: number;
    dataOffset?: number;
}

export interface IndexBufferDescription {
    name: string;
    usage?: number;
    randomAccessible?: boolean;
    resource: IndexResourceDescription;
}

function parseArrayType(typedArray: TypedArray): string {
    if (typedArray instanceof Uint16Array) return 'uint16';
    else if (typedArray instanceof Uint32Array) return 'uint32';
    else return 'Unknown Format';
}

export class IndexBuffer extends Buffer {
    public type: string;
    public length: number;

    constructor(description: IndexBufferDescription) {
        let randomAccessible = false;
        let defaultUsage = GPUBufferUsage.INDEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        randomAccessible = description.randomAccessible === undefined ? randomAccessible : description.randomAccessible;
        randomAccessible && (defaultUsage |= GPUBufferUsage.STORAGE);

        const bufferDesc = {
            name: description.name,
            usage: description.usage ? description.usage : defaultUsage,
            size: description.resource.arrayRef.value.byteLength
        };
        super(bufferDesc);

        this.length = description.resource.arrayRef.value.length;
        this.type = parseArrayType(description.resource.arrayRef.value);
        this.registerStrutureMap(description.resource.arrayRef, description.resource.dataOffset, description.resource.size);
    }

    static create(description: IndexBufferDescription): IndexBuffer {
        return new IndexBuffer(description);
    }

    destroy(): void {
        // @ts-ignore release memory
        this.length = null; this.type = null;
        super.destroy();
    }
}

export function indexBuffer(description: IndexBufferDescription): IndexBuffer {
    return IndexBuffer.create(description);
}