import { Mat4 } from "../math/mat4";
import { Vec3 } from "../math/vec3";
import { Numeric } from "./numeric"

export class Vec4f extends Numeric {
     
    constructor(x?: number, y?: number, z?: number, w?: number): Vec4f;

    get x(): number;
    get y(): number;
    get z(): number;
    get w(): number;
    set x(x: number): void;
    set y(y: number): void;
    set z(z: number): void;
    set w(w: number): void;

    static create(x?: number, y?: number, z?: number, w?: number): Vec4f;

    transformFromMat4(m: Mat4): Vec4f;
}

export function vec4f(x?: number, y?: number, z?: number, w?: number): Vec4f;

export function asVec4f(x?: number, y?: number, z?: number, z?: number): { type: string, data: Vec4 }