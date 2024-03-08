import { Numeric } from "./numeric";

export class I32 extends Numeric {

    constructor(a?: number): I32;

    static create(a?: number): I32;

    add(a: number): I32;
}


export function i32(a: number): I32;
export function asI32(a: number): { type: string, data: number };