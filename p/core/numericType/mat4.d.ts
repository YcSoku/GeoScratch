import { F32 } from "./f32";
import { Vec3f } from "./vec3f";
import { DataType, Numeric } from "./numeric";

export class Mat4 extends Numeric{

    constructor(type: DataType): Mat4;

    static create(type: DataType): Mat4;

    static setDefaultComputeType(ctor: Float32Array | Float64Array | Array): void;

    static idetity(type?: DataType): Mat4 | [number];

    static inverse(m: Mat4 | [number], type?: DataType): Mat4 | [number];

    static transposing(m: Mat4 | [number], type?: DataType): Mat4 | [number];

    static scaling(m: Mat4 | [number], v: Vec3f | [number], type?: DataType): Mat4 | [number];

    static rotationX(m: Mat4 | [number], radius: F32 | number, type?: DataType): Mat4 | [number];

    static rotationY(m: Mat4 | [number], radius: F32 | number, type?: DataType): Mat4 | [number];

    static rotationZ(m: Mat4 | [number], radius: F32 | number, type?: DataType): Mat4 | [number];

    static translation(m: Mat4 | [number], v: Vec3f | [number], type?: DataType): Mat4 | [number];

    static multiplication(m1: Mat4 | [number], m2: Mat4 | [number], type?: DataType): Mat4 | [number];

    static projection(fov: F32 | number, aspect: F32 | number, near: F32 | number, far: F32 | number, type?: DataType): Mat4 | [number];

    scale(v: Vec3f | [number]): Mat4;

    rotateX(radius: F32 | number): Mat4;

    rotateY(radius: F32 | number): Mat4;

    rotateZ(radius: F32 | number): Mat4;

    lookAt(eye: Vec3f | [number], target: Vec3f | [number], up: Vec3f | [number]): Mat4;

    transpose(m: Mat4 | [number]): Mat4;

    invert(m: Mat4 | [number]): Mat4;

    perspective(fov: F32 | number, aspect: F32 | number, near: F32 | number, far: F32 | number): Mat4;

    translate(v: Vec3f | [number]): Mat4;
    
    multiply(m: Mat4 | [number]): Mat4;

    clone(m: Mat4 | [number]): Mat4;
}

export function mat4(type: DataType = 'f'): Mat4;