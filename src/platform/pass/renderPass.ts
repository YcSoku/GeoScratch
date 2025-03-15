import { UUID } from "../../core/util/util"
import { Binding } from "../binding/binding"
import { RenderPipeline } from "../pipeline/renderPipeline"
import { Texture } from "../texture/texture"

export interface RenderPassDescription {
    name: string;
    colorAttachments: Array<{
        colorResource: Texture;
        clearValue?: Array<number>;
        loadOp?: 'clear' | 'load';
        storeOp?: 'store' | 'discard';
    }>;
    depthStencilAttachment?: {
        depthStencilResource: Texture;
        depthClearValue?: number;
        depthLoadOp?: 'clear' | 'load';
        depthStoreOp?: 'store' | 'discard';
    };
}

export class RenderPass {
    public pass: GPURenderPassEncoder | null = null;
    public executable: boolean = true;

    private uuid: string;
    private name: string;
    private colorDescription: RenderPassDescription['colorAttachments'];
    private colorAttachments: Array<GPURenderPassColorAttachment>;
    private depthStencilDescription: RenderPassDescription['depthStencilAttachment'];
    private depthStencilAttachment: GPURenderPassDepthStencilAttachment | undefined;
    private drawcalls: Array<{ pipeline: RenderPipeline; binding: Binding }>;
    private dirty: boolean;
    private initialized: boolean;
    private completed: boolean;
    private passDescription: GPURenderPassDescriptor | undefined;

    constructor(description: RenderPassDescription) {
        this.uuid = UUID();
        this.name = description.name;
        this.colorDescription = description.colorAttachments;
        this.colorAttachments = new Array(this.colorDescription.length);
        this.depthStencilDescription = description.depthStencilAttachment;
        this.depthStencilAttachment = undefined;
        this.drawcalls = [];
        this.dirty = true;
        this.initialized = false;
        this.completed = false;
    }

    static create(description: RenderPassDescription): RenderPass {
        return new RenderPass(description);
    }

    private addColorAttachments(): void {
        this.colorDescription.forEach((description, index) => {
            this.colorAttachments[index] = {
                view: description.colorResource.view(),
                clearValue: description.clearValue ?? [0.0, 0.0, 0.0, 1.0],
                loadOp: description.loadOp ?? 'clear',
                storeOp: description.storeOp ?? 'store'
            };

            description.colorResource.registerCallback(() => {
                this.colorAttachments[index].view = description.colorResource.view();
            });
        });
    }

    private addDepthStencilAttachment(): void {
        if (!this.depthStencilDescription) return;

        this.depthStencilAttachment = {
            view: this.depthStencilDescription.depthStencilResource.view(),
            depthClearValue: this.depthStencilDescription.depthClearValue ?? 1.0,
            depthLoadOp: this.depthStencilDescription.depthLoadOp ?? 'clear',
            depthStoreOp: this.depthStencilDescription.depthStoreOp ?? 'store'
        };

        this.depthStencilDescription.depthStencilResource.registerCallback(() => {
            if (this.depthStencilAttachment) {
                this.depthStencilAttachment.view = this.depthStencilDescription!.depthStencilResource.view();
            }
        });
    }

    public makeColorFormats(): Array<GPUTextureFormat> {
        const colorFormats = new Array<GPUTextureFormat>(this.colorDescription.length);
        this.colorDescription.forEach((description, index) => {
            colorFormats[index] = description.colorResource.format;
        });
        return colorFormats;
    }

    public makeDepthStencilFormat(): GPUTextureFormat | null {
        if (!this.depthStencilDescription) return null;
        return this.depthStencilDescription.depthStencilResource.format;
    }

    public updateColorAttachments(): void {
        this.colorDescription.forEach((description, index) => {
            this.colorAttachments[index] = {
                view: description.colorResource.view(),
                clearValue: description.clearValue ?? [0.0, 0.0, 0.0, 0.0],
                loadOp: description.loadOp ?? 'clear',
                storeOp: description.storeOp ?? 'store'
            };
        });
    }

    public updateDepthStencilAttachment(): void {
        if (!this.depthStencilDescription) return;

        this.depthStencilAttachment = {
            view: this.depthStencilDescription.depthStencilResource.view(),
            depthClearValue: this.depthStencilDescription.depthClearValue ?? 1.0,
            depthLoadOp: this.depthStencilDescription.depthLoadOp ?? 'clear',
            depthStoreOp: this.depthStencilDescription.depthStoreOp ?? 'store'
        };
    }

    /**
     * Get current texture used by canvas
     * More efficient than update()
     * !!!!!!!!!! Only can be used by the last renderPass !!!!!!!!!!
     * @deprecated
     */
    public updateSwapChain(canvasTextureIndex: number = 0): void {
        if (this.passDescription) {
            // @ts-ignore
            this.passDescription.colorAttachments[canvasTextureIndex].view =
                this.colorDescription[canvasTextureIndex].colorResource.view();
        }
    }

    private initialize(): void {
        if (this.initialized) return;

        this.addColorAttachments();
        this.addDepthStencilAttachment();
        this.initialized = true;
    }

    private isComplete(): boolean {
        if (this.completed) return true;

        this.completed = true;

        this.colorDescription.forEach(description => {
            if (!description.colorResource.texture) this.completed = false;
        });

        if (this.depthStencilDescription && !this.depthStencilDescription.depthStencilResource.texture) {
            this.completed = false;
        }

        return this.completed;
    }

    public update(): void {
        this.initialize();

        this.updateColorAttachments();
        this.updateDepthStencilAttachment();

        this.passDescription = {
            label: `Render pass (${this.name})`,
            colorAttachments: this.colorAttachments,
            ...(this.depthStencilDescription && {
                depthStencilAttachment: this.depthStencilAttachment
            })
        };

        this.dirty = false;
    }

    public add(pipeline: RenderPipeline, binding: Binding): RenderPass {
        this.drawcalls.push({ pipeline, binding });
        return this;
    }

    public empty(): void {
        this.drawcalls = [];
    }

    public execute(encoder: GPUCommandEncoder): void {
        if (!this.isComplete()) return;

        if (this.dirty) this.update();

        if (!this.executable || !this.passDescription) return;

        this.pass = encoder.beginRenderPass(this.passDescription);

        this.drawcalls.forEach(({ binding, pipeline }) => {
            if (!binding.tryMakeComplete() || !pipeline.tryMakeComplete(this, binding) || 
                !pipeline.executable || !binding.executable) return;

            pipeline.draw(this, binding);
        });

        this.pass.end();
    }
}

export function renderPass(description: RenderPassDescription): RenderPass {
    return RenderPass.create(description);
}