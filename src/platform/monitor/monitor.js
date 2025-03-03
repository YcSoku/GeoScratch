export class Monitor {
    
    constructor() {
        this._memorySizeInBytes = 0
    }

    get memorySizeInBytes() {
        return this._memorySizeInBytes
    }

    set memorySizeInBytes(value) {

        this._memorySizeInBytes = value
    }

    getMemoryInMB() {

        return Math.floor(this._memorySizeInBytes / 1024.0 / 1024.0 + 0.5)
    }
}
export const monitor = new Monitor()