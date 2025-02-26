import { BoundingBox2D } from '../box/boundingBox2D'

export interface MapOptions {

    cameraBounds: BoundingBox2D;
    cameraPos: number[];
    zoomLevel: number;
}

export class Node2D {

    constructor(level: number = 0, id: number = 0, parent: Node2D = undefined): Node2D;

    release(): null;

    isSubdividable(options: MapOptions): Boolean;
}