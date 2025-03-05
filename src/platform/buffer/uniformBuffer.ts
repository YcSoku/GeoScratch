import { Buffer, BufferDescription } from "./buffer";
import { BlockRef } from "../../core/data/blockRef";

export interface UniformBufferDescription {
    name: string;
    usage?: number;
    blocks: Array<BlockRef>;
}

export class UniformBuffer extends Buffer {
    private alignSize: number;
    private dynamicBlocks: BlockRef[];
    private isInitialized: boolean;
    updatePerFrame: boolean;

    constructor(description: UniformBufferDescription) {
        let byteLength = 0;
        const alignSize = description.blocks.length === 1 ? 1 : 256;

        for (const block of description.blocks) {
            let offset = 0;
            if (block.value.byteLength % alignSize) {
                offset = alignSize - (block.value.byteLength % alignSize);
            }
            byteLength += block.value.byteLength + offset;
        }

        const bufferDesc: BufferDescription = {
            name: description.name,
            usage: description.usage ? description.usage : (GPUBufferUsage.UNIFORM | GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC),
            size: byteLength
        };
        super(bufferDesc);

        this.alignSize = alignSize;
        this.dynamicBlocks = [];
        description.blocks.forEach((block) => {
            this.addBlock(block);
        });
        this.updatePerFrame = false;
        this.dynamicBlocks.length && (this.updatePerFrame = true);
        this.isInitialized = false;
    }

    static create(description: UniformBufferDescription): UniformBuffer {
        return new UniformBuffer(description);
    }

    private addBlock(block: BlockRef): void {
        block.dynamic && this.dynamicBlocks.push(block);
        this.registerStrutureMap(block, undefined, undefined, this.alignSize);
    }

    update(): void {
        if (this.dynamicBlocks.length || !this.isInitialized) {
            this.dynamicBlocks.forEach(block => block.update());
            this.isInitialized = true;
            super.update();
        }
    }

    destroy(): void {
        // @ts-ignore
        this.alignSize = null; this.dynamicBlocks = null; this.isInitialized = null;
        super.destroy();
    }
}

export function uniformBuffer(description: UniformBufferDescription): UniformBuffer {
    return UniformBuffer.create(description);
}