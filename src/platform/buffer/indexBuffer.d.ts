import { ArrayRef } from "../data/arrayRef";

export interface IndexResourceDescription {
    arrayRef: ArrayRef,
    size?: number,
    dataOffset?: number,
}

export interface IndexBufferDescription {
    name: string,
    usage?: number,
    randomAccessible?: boolean,
    resource: IndexResourceDescription,
}

export class IndexBuffer extends Buffer {
    type: string;
    constructor(description: IndexBufferDescription);
    static create(description: IndexBufferDescription): IndexBuffer;
}