export class Monitor {
    private _memorySizeInBytes: number;

    constructor() {
        this._memorySizeInBytes = 0;
    }

    get memorySizeInBytes(): number {
        return this._memorySizeInBytes;
    }

    set memorySizeInBytes(value: number) {
        this._memorySizeInBytes = value;
    }

    getMemoryInMB(): number {
        return Math.floor(this._memorySizeInBytes / 1024.0 / 1024.0 + 0.5);
    }
}

export const monitor = new Monitor();