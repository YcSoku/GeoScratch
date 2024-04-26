import { Buffer } from './../buffer/buffer';
import { Binding } from "../binding/binding";
import { Texture } from '../texture/texture';
import { ScratchObject } from "../../core/object/object";

export class Director extends ScratchObject{
    
    executable: boolean;

    addStage(stage: {name: string, items: Array<any>, visibility?: boolean}): void;

    showStage(name: string): void;

    hideStage(name: string): void;

    addBinding(binding: Binding): void;

    addTexture(texture: Texture): void;

    removeBuffer(uuid: string): void;
    
    removeTexture(uuid: string): void;
    
    makeNewStage(name: string): Director;

    addItem(stageName: string, item: any): Director;
    
    addToUpdateList(item: Buffer | Texture | Binding): void;

    addToNextUpdateList(item: Buffer | Texture | Binding): void;

    tick(): void;

    async init(): void;
}

const director: Director;
export default director;
export { Director };
