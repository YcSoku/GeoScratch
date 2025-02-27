import { UUID } from "../util/uuid"

export default class ScratchObject {

    uuid: string
    name: string
    refCount: number
    constructor(name?: string) {

        this.uuid = UUID()
        this.refCount = 0
        this.name = name ? name : 'Base Object'
    }

    use() {

        this.refCount++
        return this
    }

    release() {

        if (--this.refCount === 0) this.destroy()

        return null
    }

    destroy() {
        // @ts-ignore : release memory
        this.name = null; this.uuid = null; this.refCount = null
    }
}