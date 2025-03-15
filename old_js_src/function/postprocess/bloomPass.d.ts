import { RenderPipeline } from "../../platform/pipeline/renderPipeline"
import { RenderPass } from "../../platform/pass/renderPass"
import { Texture } from "../../platform/texture/texture"
import shaderLoader from "../../resource/shader/shaderLoader"
import { BindingsDescription } from "../../platform/binding/binding"
import { ArrayRef } from "../../core/data/arrayRef"


export interface BloomPassDescription {
    threshold: number,
    strength: number,
    blurCount: number,
    inputColorAttachment: Texture,
}

export class BloomPass {

    constructor(description: BloomPassDescription)

    static create(description: BloomPassDescription): BloomPass

    execute(encoder: GPUCommandEncoder): void

    getOutputAttachment(): Texture

    onWindowResize(): void;
}

export function bloomPass(description: BloomPassDescription): BloomPass;