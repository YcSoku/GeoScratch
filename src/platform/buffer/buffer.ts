import { ArrayRef } from "../../core/data/arrayRef";
import { BlockRef } from "../../core/data/blockRef";
import { director } from "../director/director";
import { monitor } from "../monitor/monitor";
import ScratchObject from "../../core/object/object";

/////// Types //////////////////////////////////
type BufferDescription = {
    name: string
    size: number
    usage: GPUBufferUsageFlags
}

type AreaItem = {
    start: number
    length: number
    ref: ArrayRef | BlockRef
    dataOffset?: number
    size?: number
    callbackIndex: number
}

/////// Buffer //////////////////////////////////
class Buffer extends ScratchObject {

    size: number
    buffer: GPUBuffer | undefined
    usage: GPUBufferUsageFlags

    areaMap: Record<string, AreaItem>
    lastAreaName: string | null
    updatePerFrame: boolean
    dirtyList: Set<string>

    constructor(desc: BufferDescription) {

        super(desc.name)
        this.buffer = undefined
        this.size = desc.size
        this.usage = desc.usage

        director.dispatchEvent({ type: 'createBuffer', emitter: this })
        monitor.memorySizeInBytes += this.size

        this.areaMap = {}
        this.lastAreaName = null
        this.updatePerFrame = false
        this.dirtyList = new Set()

        this.needUpdate()
    }

    registerStrutureMap(ref: ArrayRef | BlockRef, dataOffset?: number, size?: number, alignment: number = 1) {

        let offset = 0
        if (this.lastAreaName) {
            const lastArea = this.areaMap[this.lastAreaName]
            offset = lastArea.start + lastArea.length
        }
        this.lastAreaName = ref.name

        let alignmentOffset = 0
        if (ref.value.byteLength % alignment) {
            alignmentOffset = alignment - (ref.value.byteLength % alignment)
        }
        let length = ref.value.byteLength + alignmentOffset

        this.areaMap[ref.name] = {
            start: offset,
            length: length,

            // Related CPU typedArray data information
            ref: ref.use(),
            dataOffset: dataOffset,
            size: size,
            callbackIndex: ref.registerCallback(() => {
                this.makeDirty(ref.name)
                this.needUpdate()
            })
        }

        this.makeDirty(ref.name)
    }

    makeDirty(name: string) {

        this.dirtyList.add(name)
    }

    update() {

        if (!this.dirtyList.size) return

        this.dirtyList.forEach((name) => {

            director.dispatchEvent({ type: 'writeBuffer', emitter: this, subArea: this.areaMap[name] })
        })

        this.dirtyList = new Set()
    }

    needUpdate() {

        director.addToUpdateList(this)
    }

    exportDescriptor() {
        return {
            label: this.name,
            size: this.size,
            usage: this.usage
        } as GPUBufferDescriptor
    }

    destroy() {

        this.buffer?.destroy()

        if (this.size) monitor.memorySizeInBytes -= this.size

        for (const key in this.areaMap) {
            let area = this.areaMap[key]
            // @ts-ignore
            area.callbackIndex = area.ref.removeCallback(area.callbackIndex)
            // @ts-ignore
            area.ref = area.ref.release()
            // @ts-ignore
            area.dataOffset = null; area.length = null; area.start = null; area.size = null
        }
        // @ts-ignore
        this.areaMap = null

        this.dirtyList.clear()
        super.destroy()
    }
}

export {
    Buffer
}