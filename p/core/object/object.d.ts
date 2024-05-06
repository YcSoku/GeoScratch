export class ScratchObject {

    uuid: string;
    
    name: string;

    refCount: number;

    constructor(): ScratchObject;
    
    use(): ScratchObject;

    release(): null;

    destroy(): void;
}