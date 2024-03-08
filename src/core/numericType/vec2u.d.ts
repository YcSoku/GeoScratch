import { Numeric } from "./numeric"

export class Vec2u extends Numeric {
     
    constructor(x?: number, y?: number): Vec2u;

    static create(x: number, y: number): Vec2u;
}

export function vec2u(x?: number, y?: number): Vec2u;

export function asVec2u(x?: number, y?: number): { type: string, value: Function };