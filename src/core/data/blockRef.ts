import { makeShaderDataDefinitions, makeStructuredView, StructuredView } from "webgpu-utils"
import ObservableObject from "../object/observableObject"
import { NumericInterface } from "../numeric/numeric"

/////// Types //////////////////////////////////
type BlockRefDescription = {
    name: string
    dynamic?: boolean
    map: Record<string, NumericInterface>
}



/////// BlockRef //////////////////////////////////
class BlockRef extends ObservableObject {

    map: Record<string, NumericInterface> = {}
    code: string
    dynamic: boolean

    private _view: StructuredView

    constructor(description: BlockRefDescription) {

        super(description.name)
        this.map = description.map
        this.dynamic = description.dynamic ? description.dynamic : false

        // Make structured view of block
        let typeDeclaration = ``
        Object.keys(this.map).forEach(k => {
            typeDeclaration += `${k}: ${this.map[k].type},\n`
            this.map[k]
        })
        this.code = `struct Block {
            ${typeDeclaration}
        }`
        const defs = makeShaderDataDefinitions(this.code)
        this._view = makeStructuredView(defs.structs.Block)

        this._view && this.update()
    }

    get value() {
        return this._view.arrayBuffer
    }

    get view() {
        return this._view
    }

    // ? 
    set view(view) {

        this._view = view
        this.update()
    }

    update() {

        const data = {}
        for (const key in this.map) {
            data[key] = this.map[key].data
        }
        this._view.set(data)

        super.invokeCallbacks()
    }

    destroy() {
        // @ts-ignore release memory
        this.dynamic = null; this.code = null;
        // @ts-ignore release memory
        this.map = null; this._view = null
        super.destroy()
    }
}

function bRef(description: BlockRefDescription) {
    return new BlockRef(description)
}

export {
    BlockRef,
    bRef
}