import { EventDispatcher } from "../event/dispatcher"
import { UUID } from "../utils/uuid"

export class ScratchObject extends EventDispatcher {

    constructor() {

        super()

        this.uuid = UUID()
        this.refCount = 0
        this.name = 'Base Object'
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

        this.name = null
        this.uuid = null
        this.refCount = null
    }
}