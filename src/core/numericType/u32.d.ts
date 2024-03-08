import { Numeric } from "./numeric";

export class U32 extends Numeric {

    constructor(a?: number): U32;

    static create(a?: number): U32;

    add(a: number): U32;
}


export function u32(a: number): U32;
export function asU32(a: number): { type: string, value: Function };