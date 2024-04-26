import { Mat4 } from "../math/mat4";
import { Vec3 } from "../math/vec3";
import { F32 } from "./f32";
import { Numeric } from "./numeric"

export class Vec3f extends Numeric {
     
    constructor(x?: number, y?: number, z?: number): Vec3f;

    get x(): number;
    get y(): number;
    get z(): number;
    get xy(): number[]
    get yz(): number[]
    get xyz(): number[]
    set x(x: number): void;
    set y(y: number): void;
    set z(z: number): void;
    set xy(xy: number[]): void
    set yz(yz: number[]): void
    set xyz(xyz: number[]): void

    static create(x?: number, y?: number, z?: number): Vec3f;

    static CrossProduct(v1: Vec3f, v2: Vec3f): Vec3f;

    static Subtract(v1: Vec3f, v2: Vec3f): Vec3f;

    subtract(v: Vec3f): Vec3f;

    transformFromMat4(m: Mat4): Vec3f;

    normalize(): Vec3f;

    scale(s: F32 | number): Vec3f;

    dot(v: Vec3f): number;

    cross(v: Vec3f): number;

    get array(): Float32Array;

    copy(v: Vec3f): Vec3f;
}

export function vec3f(x?: number, y?: number, z?: number): Vec3f;

export function asVec3f(x?: number, y?: number, z?: number): { type: string, data: Vec3 }