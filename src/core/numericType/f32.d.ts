import { Numeric } from "./numeric";

export class F32 extends Numeric {

    constructor(a?: number): F32;

    static create(a?: number): F32;

    add(a: number): F32;
}


export function f32(a: number): F32;
export function asF32(a: number): { type: string, value: Function };