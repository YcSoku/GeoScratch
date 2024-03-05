import { Binding } from "../binding/binding";
import { RenderPass } from "../pass/renderPass";
import { Shader } from "../shader/shader";

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

export class RenderPipeline {

    constructor(description: RenderPipelineDescription);

    static create(ddescription: RenderPipelineDescription): DrawCommand;

    draw(rednerPass: RenderPass, binding: Binding): void;
    
    setBinding(binding: Binding): void;

    tryMakeComplete(renderPass: RenderPass, binding: Binding): boolean;

    triggerFiniteTimes(times: number): RenderPipeline;
}