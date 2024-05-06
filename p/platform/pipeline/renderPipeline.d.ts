import { Binding } from "../binding/binding";
import { RenderPass } from "../pass/renderPass";
import { Shader } from "../shader/shader";
import { ScratchObject } from "../../core/object/object";

export interface RenderPipelineDescription {
    name?: string,
    shader: {
        module: Shader,
        vsEntryPoint?: string, 
        fsEntryPoint?: string,
    },
    primitive?: GPUPrimitiveState,
    colorTargetStates?: Array<{blend?: GPUBlendState, writeMask?: GPUColorWriteFlags}>,
    asBundle?: boolean,
    depthTest?: boolean,
}

export class RenderPipeline extends ScratchObject {

    executable: boolean;

    constructor(description: RenderPipelineDescription);

    static create(ddescription: RenderPipelineDescription): DrawCommand;

    draw(rednerPass: RenderPass, binding: Binding): void;
    
    setBinding(binding: Binding): void;

    exportLayoutDescriptor(): GPUPipelineLayoutDescriptor;

    exportDescriptor(): GPURenderPipelineDescriptor;

    setDependency(renderPass: RenderPass, binding: Binding): boolean;

    tryMakeComplete(renderPass: RenderPass, binding: Binding): boolean;

    triggerFiniteTimes(times: number): RenderPipeline;
}

export function renderPipeline(description: RenderPipelineDescription): RenderPipeline;