export class ArrayRef {

    constructor(name: string, data: ArrayBufferLike);

    name: string;

    registerCallback(callback: (name: string) => void): number;

    removeCallback(index: number): null;

    get value(): ArrayBufferLike;
    set value(data: ArrayBufferLike);

    elements(index: number, data?: number): ArrayBufferLike | void;

    use(): ArrayRef;

    release(): null;
}

export function aRef(typedArray: ArrayBufferLike, name?: string): ArrayRef;
