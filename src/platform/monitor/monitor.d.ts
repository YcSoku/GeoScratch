export class Monitor {

    constructor();

    set memorySizeInBytes(value);
    get memorySizeInBytes(): number;

    getMemoryInMB(): number
}


export const monitor: Monitor;