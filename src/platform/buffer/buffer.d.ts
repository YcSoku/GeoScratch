// import { DataRef } from '../../core/data/arrayRef';
import { ArrayRef } from "../../core/data/arrayRef";
export type BufferDescription = {
    name: string;
    usage?: number;
    size: number;
};

export class Buffer {

    constructor(description: BufferDescription);

    name: string;

    buffer: GPUBuffer;

    updatePerFrame: boolean;

    areaMap: { [mapName: string]: { start: number, length: number, arrayRef: ArrayRef, dataOffset?: number, size?: number } };

    exportDescriptor(): GPUBufferDescriptor;

    registerStrutureMap(dataRef: unknown, dataOffset?: number, size?: number, alignment?: number): void;

    updateSubArea(name: string): void;

    makeDirty(name: string): void;

    update(): void;

    needUpdate(): void;

    isComplete(): boolean;

    use(): Buffer;

    release(): null;

    destroy(): void;
}
