import { Buffer } from './../buffer/buffer';
import { Binding } from "../binding/binding";
import { Texture } from '../texture/texture';

export class Director {

    addStage(stage: {name: string, items: Array<any>, visibility?: boolean}): void;
    showStage(name: string): void;
    hideStage(name: string): void;
    addBinding(binding: Binding): void;
    addBuffer(buffer: Buffer): void;
    addTexture(texture: Texture): void;
    removeBuffer(uuid: string): void;
    removeTexture(uuid: string): void;
    makeNewStage(name: string): Director;
    addItem(stageName: string, item: any): Director;
    tick(): void;
}

const director: Director;
export default director;
export { Director };
