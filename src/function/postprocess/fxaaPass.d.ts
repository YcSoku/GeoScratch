import { RenderPipeline } from "../../platform/pipeline/renderPipeline"
import { RenderPass } from "../../platform/pass/renderPass"
import { Texture } from "../../platform/texture/texture"
import shaderLoader from "../../resource/shader/shaderLoader"
import { BindingsDescription } from "../../platform/binding/binding"
import { ArrayRef } from "../../core/data/arrayRef"


export interface FXAAPassDescription {
    threshold: number,
    searchStep: number,
    inputColorAttachment: Texture,
}

export class FXAAPass {

    constructor(description: FXAAPassDescription)

    static create(description: FXAAPassDescription): FXAAPass

    execute(encoder: GPUCommandEncoder): void

    getOutputAttachment(): Texture

    onWindowResize(): void;
}

export function fxaaPass(description: FXAAPassDescription): FXAAPass;