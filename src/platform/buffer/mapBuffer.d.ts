import { Buffer } from "./buffer";

export interface MapBufferDescription {
    name: string,
    mapTarget: Buffer
}

export class MapBuffer extends Buffer {

    constructor(description: MapBufferDescription)

    static create(description: MapBufferDescription): MapBuffer

    mapping(): Promise<ArrayBuffer>;
}