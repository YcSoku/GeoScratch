import { DataRef } from '../data/arrayRef';
export type BufferDescription = {
    name: string;
    usage?: number;
    size: number;
};

export class Buffer {
    constructor(description: BufferDescription);

    name: string;

    buffer: GPUBuffer;

    areaMap: {[mapName: string]: {start: number, length: number, arrayRef: ArrayRef, dataOffset?: number, size?: number}};
 
    registerStrutureMap(dataRef: DataRef, dataOffset?: number, size?: number, alignment = 1): void;

    updateSubArea(name: string): void;

    makeDirty(name: string): void;

    update(): void;

    isComplete(): boolean;

    use(): Buffer;

    release(): null;

    destroy(): void;
}
