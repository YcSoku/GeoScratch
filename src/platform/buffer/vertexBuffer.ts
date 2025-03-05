import { TypedArray } from "webgpu-utils";
import { Buffer } from "./buffer";
import { ArrayRef } from "../../core/data/arrayRef";

function parseArrayType(typedArray: TypedArray): { format: string; bytesPerComponent: number } {
    let format = '';
    let bytesPerComponent = 1;
    if (typedArray instanceof Float32Array) {
        format = 'float32';
        bytesPerComponent = 4;
    } else if (typedArray instanceof Int32Array) {
        format = 'int32';
        bytesPerComponent = 4;
    } else if (typedArray instanceof Uint32Array) {
        format = 'uint32';
        bytesPerComponent = 4;
    } else {
        return {
            format: "Unknown Format",
            bytesPerComponent: 1
        };
    }

    return {
        format,
        bytesPerComponent
    };
}

export interface VertexResourceDescription {
    arrayRef: ArrayRef; // must provide TypedArray
    dataOffset?: number; // in bytes
    size?: number; // element length of the TypedArray
    structure: Array<{components: number}>;
}

export interface VertexBufferDescription {
    name: string;
    usage?: number;
    randomAccessible?: boolean;
    resource: VertexResourceDescription;
}

export class VertexBuffer extends Buffer {
    // stepMode: GPUVertexStepMode;
    attributes: Array<{format: GPUVertexFormat, offset: number}>;
    stride: number;
    private bytesPerComponent: number;

    constructor(description: VertexBufferDescription) {
        let randomAccessible = false;
        let defaultUsage = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC;
        randomAccessible = description.randomAccessible ?? randomAccessible;
        randomAccessible && (defaultUsage |= GPUBufferUsage.STORAGE);

        const bufferDesc = {
            name: description.name,
            usage: description.usage ?? defaultUsage,
            size: description.resource.arrayRef.value.byteLength
        };
        super(bufferDesc);
        this.registerStrutureMap(description.resource.arrayRef, description.resource.dataOffset, description.resource.size);

        this.attributes = [];
        this.stride = 0;
        const {format: arrayFormat, bytesPerComponent} = parseArrayType(description.resource.arrayRef.value);
        this.bytesPerComponent = bytesPerComponent;
        description.resource.structure.forEach((member) => {
            this.attributes.push({
                format: arrayFormat + (member.components > 1 ? `x${member.components}` : '') as GPUVertexFormat,
                offset: this.stride
            });
            this.stride += bytesPerComponent * member.components;
        });
    }

    static create(description: VertexBufferDescription): VertexBuffer {
        return new VertexBuffer(description);
    }

    getComponentsPerElement(): number {
        return this.stride / this.bytesPerComponent;
    }

    destroy(): void {
        // @ts-ignore release memory
        this.stride = null;
        this.attributes = [];
        super.destroy();
    }
}

export function vertexBuffer(description: VertexBufferDescription): VertexBuffer {
    return VertexBuffer.create(description);
}