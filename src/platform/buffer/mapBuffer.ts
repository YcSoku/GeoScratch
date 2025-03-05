import { device } from "../context/singletonDevice";
import { Buffer } from "./buffer";
import { ElementType, TypeConstructor, TypeBytes } from "./util";

type MapBufferDescription = {
    name: string,
    mapTarget: Buffer,
}

class MapBuffer extends Buffer {

    mapTarget: Buffer
    fullSize: number

    constructor(description: MapBufferDescription) {
        const bufferDesc = {
            name: description.name,
            usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
            size: description.mapTarget.size
        }
        super(bufferDesc)

        this.mapTarget = description.mapTarget.use()
        this.fullSize = description.mapTarget.size
    }

    static create(description: MapBufferDescription) {

        return new MapBuffer(description)
    }

    mapRead(offset: number, size: number, elementType: ElementType): Promise<ArrayBufferView> {

        const elBytes = TypeBytes[elementType]

        return new Promise(async (resolve, reject) => {

            if (!this.buffer || !this.mapTarget.buffer) {
                reject(new Error("Buffer not ready.")); return
            }
            if (size > this.fullSize || offset + size / elBytes > this.fullSize || offset < 0 || size < 0) {
                reject(new Error("Invalide mappinrg range."));
            }
            if (!(this.buffer.mapState === 'unmapped')) {
                reject(new Error("Buffer is not in 'unmapped' state."));
            }

            try {

                const mapEncoder = device.createCommandEncoder({ label: `Map encoder (map buffer ${this.name})` })
                mapEncoder.copyBufferToBuffer(this.mapTarget.buffer, offset, this.buffer, 0, size)
                device.queue.submit([mapEncoder.finish()])

                await this.buffer.mapAsync(GPUMapMode.READ)
                const result = new TypeConstructor[elementType](this.buffer.getMappedRange(offset, size))
                const copiedData = new TypeConstructor[elementType](result.length)
                copiedData.set(result)
                this.buffer.unmap()
                resolve(copiedData)
            } catch (err) {

                reject(err)
            }
        })
    }

    mapWrite(offset: number, size: number, elementType: ElementType, data: ArrayBufferView) {
        // Not good implementation compared to <device.Q.writeBuffer>
    }

    destroy() {
        // @ts-ignore release memory
        this.mapTarget = this.mapTarget.release(); this.fullSize = null
        super.destroy()
    }

}

function mapBuffer(description: MapBufferDescription) {
    return MapBuffer.create(description)
}

export {
    mapBuffer,
    MapBuffer
}