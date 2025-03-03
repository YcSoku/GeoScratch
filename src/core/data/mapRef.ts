import ObservableObject from "../object/observableObject";
import { ElementType, TypeBytes } from "../../platform/buffer/util";
import { StorageBuffer } from "../../platform/buffer/sstorageBuffer";

type MapRefDescription = {
    mapTarget: StorageBuffer,
    elementType: ElementType,
    range: {
        offset: number,
        lenght: number,
    }
}

class MapRef extends ObservableObject {

    private offset: number
    private length: number // in element
    private size: number // in byte

    sourceBuffer: StorageBuffer

    rangeWrite: Function
    rangeRead: Function

    constructor(name: string, description: MapRefDescription) {
        super(name)
        this.offset = description.range.offset
        this.length = description.range.lenght
        this.size = description.range.lenght * TypeBytes[description.elementType]

        this.sourceBuffer = description.mapTarget

        const res = this.sourceBuffer.registerMapRange(this.offset, this.size, description.elementType)
        this.rangeRead = res.R
        this.rangeWrite = res.W

    }


}