import { Binding } from "../binding/binding";
import { ComputePass } from "../pass/computePass";
import { Shader } from "../shader/shader";

/**
 * Description of a ComputableBuilder.
 */
export interface ComputePipelineDescription {
    name?: string,
    shader: {
        module: Shader,
        csEntryPoint?: string,
    },
    constants: { [constantName: string]: number },
}

/**
 * Represents a ComputableBuilder.
 */
export class ComputePipeline {
    /**
     * Name of the ComputableBuilder.
     */
    name: string;

    executable: boolean;

    /**
     * Pipeline layout associated with the ComputableBuilder.
     */
    pipelineLayout: GPUPipelineLayout;

    /**
     * Compute pipeline associated with the ComputableBuilder.
     */
    pipeline: GPUComputePipeline;

    /**
     * Creates an instance of ComputableBuilder.
     * @param {ComputePipelineDescription} description - The description object.
     */
    constructor(description: ComputePipelineDescription);

    /**
     * Creates a ComputableBuilder.
     * @param {ComputePipelineDescription} description - The description object.
     */
    static create(description: ComputePipelineDescription): ComputePipeline;

    tryMakeComplete(computePass: ComputePass, binding: Binding): boolean;


    dispatch(computePass: ComputePass, binding: Binding): void;

    triggerFiniteTimes(times: number): ComputePipeline;
}

export function computePipeline(description: ComputePipelineDescription): ComputePipeline;
