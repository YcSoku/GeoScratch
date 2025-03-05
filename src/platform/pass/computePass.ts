import { UUID } from "../../core/util/util";
import { Binding } from "../binding/binding";
import { ComputePipeline } from "../pipeline/computePipeline";

export interface ComputePassDescription {
    name: string;
}

interface ComputeCall {
    pipeline: ComputePipeline;
    binding: Binding;
}

export class ComputePass {
    private uuid: string;
    private name: string;
    private computecalls: ComputeCall[];
    private pass: GPUComputePassEncoder | undefined;
    private passDescription!: { label: string };
    public executable: boolean;

    constructor(description: ComputePassDescription) {
        this.uuid = UUID();
        this.name = description.name;
        this.computecalls = [];
        this.pass = undefined;
        this.update();
        this.executable = true;
    }

    static create(description: ComputePassDescription): ComputePass {
        return new ComputePass(description);
    }

    update(): void {
        this.passDescription = {
            label: `Compute pass (${this.name})`
        };
    }

    add(pipeline: ComputePipeline, binding: Binding): ComputePass {
        this.computecalls.push({ pipeline, binding });
        return this;
    }

    empty(): void {
        this.computecalls = [];
    }

    execute(encoder: GPUCommandEncoder): void {
        if (!this.executable) return;
        this.pass = encoder.beginComputePass(this.passDescription);
        console.log(this.pass)
        this.computecalls.forEach(({ binding, pipeline }) => {
            if (!binding.tryMakeComplete() || !pipeline.tryMakeComplete(this, binding) || !pipeline.executable || !binding.executable) return;
            pipeline.dispatch(this, binding);
        });
        this.pass.end();
    }
}

export function computePass(description: ComputePassDescription): ComputePass {
    return ComputePass.create(description);
}