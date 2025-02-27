import ScratchObject from "./object"
import { AnyCallBack } from "../util/types"

export default class RegistrableObject extends ScratchObject {

    onChanges: Array<AnyCallBack | null>
    constructor(name?: string) {

        super(name)
        this.onChanges = []
    }

    registerCallback(callback: AnyCallBack) {

        this.onChanges.push(callback)
        return this.onChanges.length - 1
    }

    removeCallback(indexOrFunction: number | AnyCallBack) {

        // ? splice or not
        if (typeof indexOrFunction === 'number') {
            this.onChanges[indexOrFunction] = null
        } else {
            const index = this.onChanges.indexOf(indexOrFunction)
            if (index === -1) throw 'Callback not registered ' + indexOrFunction.toString()
            this.onChanges[index] = null
        }
    }

    destroy() {
        this.onChanges = []
        super.destroy()
    }
}