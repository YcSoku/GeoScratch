import { aRef } from "../../src/core/data/arrayRef"
import { bRef } from "../../src/core/data/blockRef"
import * as Numeric from "../../src/core/numeric/index"

export default () => {

    ///////////////////////////////////////////////////
    /////// ArrayRef Tests ////////////////////////////

    /////// create ArrayRef //////////////////////////////////
    const posArrayRef = aRef(new Float32Array([1, 2, 3, 4, 5, 6]), "posArrayRef")
    /////// register callback //////////////////////////////////
    posArrayRef.registerCallback(() => {
        console.log("posArrayRef changed", posArrayRef.value)
    })
    posArrayRef.registerCallback(() => {
        console.log(" 2 : posArrayRef changed ")
    })
    /////// value //////////////////////////////////
    console.log(posArrayRef.value)
    posArrayRef.value = new Float32Array([11, 22, 33, 44, 55, 66])
    console.log(posArrayRef.value)
    /////// element //////////////////////////////////
    console.log(posArrayRef.element(0))
    console.log(posArrayRef.element(0, 10))
    /////// fill //////////////////////////////////
    posArrayRef.fill(0)



    ///////////////////////////////////////////////////
    /////// BlockRef Tests ////////////////////////////
    const blockRef = bRef({
        name: 'test-blockRef',
        dynamic: true,
        map: {
            'a': { type: 'f32', data: 0.5 },
            'b': { type: 'u32', data: 1 },
            'c': { type: 'vec2u', data: [2, 2] },
            'd': { type: 'vec4f', data: [3, 3, 3, 3] },
            'e': Numeric.mat4f(),
            'f': Numeric.f32(),
            'g': Numeric.vec2i(2, 2),
            'h': Numeric.vec3f(1),
            'i': Numeric.vec2u(),
            'j': Numeric.vec3i(),
        }
    })
    console.log(blockRef.view)
    blockRef.registerCallback(() => {
        console.log('block ref change!')
    })

}