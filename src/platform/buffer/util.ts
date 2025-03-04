/////// Types //////////////////////////////////
export type ElementType = "U32" | "F32" | "U16" | "U8";




/////// Helpers //////////////////////////////////
export const TypeBytes = {
    "U32": 4,
    "F32": 4,
    "U16": 2,
    "U8": 1,
}
export const TypeConstructor = {
    "U32": Uint32Array,
    "F32": Float32Array,
    "U16": Uint16Array,
    "U8": Uint8Array
}
