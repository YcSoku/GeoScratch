import { F32 } from "./f32";
import { Mat4 } from "../math/mat4";
import { DataType, Numeric } from "./numeric";

export class Vec3 extends Numeric {

    get x(): number;

    get y(): number;

    get z(): number;

    get xy(): number[];

    get yz(): number[];

    get xyz(): number[];

    set x(x: number): void;

    set y(y: number): void;

    set z(z: number): void;

    set xy(xy: number[]): void;

    set yz(yz: number[]): void;

    set xyz(xyz: number[]): void;
     
    constructor(type: DataType, x?: number, y?: number, z?: number): Vec3;

    static setDefaultComputeType(ctor: Float32Array | Float64Array | Array): void;

    static create(type: DataType, x?: number, y?: number, z?: number): Vec3;

    static fromValues(x?: number, y?: number, z?: number, type?: DataType): Vec3;

    static crossing(v1: Vec3 | [number], v2: Vec3 | [number], type: DataType): Vec3 | [number];

    static subtraction(v1: Vec3 | [number], v2: Vec3 | [number], type: DataType): Vec3 | [number];

    normalize(): Vec3;

    scale(s: F32 | number): Vec3;

    dot(v: Vec3 | [number]): number;

    cross(v: Vec3 | [number]): Vec3;

    clone(v: Vec3 | [number]): Vec3;

    subtract(v: Vec3 | [number]): Vec3;

    transformFromMat4(m: Mat4 | [number]): Vec3;
}

export function vec3(type?: DataType, x?: number, y?: number, z?: numbe): Vec3;