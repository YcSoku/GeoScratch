import { BoundingBox2D } from '../box/boundingBox2D'
import { Vec3f } from '../numericType/vec3f';

export interface MapOptions {

    cameraBounds: BoundingBox2D;
    cameraPos: number[];
    zoomLevel: number;
    uln: Vec3f;
    brf: Vec3f;
    nNear: Vec3f;
    nFar: Vec3f;
    nLeft: Vec3f;
    nRight: Vec3f;
    nUp: Vec3f;
    nBottom: Vec3f;
}

export class Node2D {

    constructor(level: number = 0, id: number = 0, parent: Node2D = undefined): Node2D;

    release(): null;

    isSubdividable(options: MapOptions): Boolean;

    isVisible(options: MapOptions): Boolean;
}