import { Numeric } from "./numeric"
import { Mat4 } from "../math/wgpu-matrix";

export class Vec3f extends Numeric {
     
    constructor(x?: number, y?: number, z?: number): Vec3f;

    get x(): number;
    get y(): number;
    get z(): number;

    static create(x?: number, y?: number, z?: number): Vec3f;

    transformFromMat4(m: Mat4): Vec3f;
}

export function vec3f(x?: number, y?: number, z?: number): Vec3f;