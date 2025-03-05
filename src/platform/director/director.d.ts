import { type Buffer } from '../buffer/buffer';
import { type Binding } from "../binding/binding";
import { type Texture } from '../texture/texture';
import { EventDispatcher } from '../../core/event/dispatcher';
import { type Sampler } from '../sampler/sampler';
import { type Shader } from '../shader/shader';

export class Director extends EventDispatcher {

    addStage(stage: { name: string, items: Array<any>, visibility?: boolean }): void;
    showStage(name: string): void;
    hideStage(name: string): void;
    addBinding(binding: Binding): void;
    addToUpdateList(item: Buffer | Texture | Sampler | Shader): void;
    addTexture(texture: Texture): void;
    removeBuffer(uuid: string): void;
    removeTexture(uuid: string): void;
    makeNewStage(name: string): Director;
    addItem(stageName: string, item: any): Director;
    tick(): void;

    init(): Promise<void>;
}

export const director: Director
