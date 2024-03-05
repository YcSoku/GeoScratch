import { Buffer } from './../buffer/buffer';
import { IndexBuffer } from "../buffer/indexBuffer";
import { IndirectBuffer } from "../buffer/indirectBuffer";
import { VertexBuffer } from "../buffer/vertexBuffer";
import { Shader } from "../shader/shader";
import { Texture } from "../texture/texture";
import { UniformBuffer } from '../buffer/uniformBuffer';
import { StorageBuffer } from '../buffer/storageBuffer';
import { BlockValueType } from '../data/blockRef';

export interface UniformBindingDescription {
    name: string,
    dynamic?: boolean,
    visibility?: number,
    map: {[varName: string]: {type: BlockValueType, value: Function}},
};

export interface SharedUniformBindingDescription {
    buffer: UniformBuffer,
    visibility?: number,
}

export interface StorageBindingDescription {
    buffer: StorageBuffer | VertexBuffer | IndexBuffer | IndirectBuffer,
    writable?: boolean
};

export interface IndexBindingDescription {
    buffer: IndexBuffer
};

export interface IndirectBindingDescription {
    buffer: IndirectBuffer
    byteOffset?: number
};

export interface SamplerDescription {
    name: string,
    addressModeUVW: Array<GPUAddressMode>,
    filterMinMag: Array<GPUFilterMode>,
    visibility?: number,
    bindingType?: GPUSamplerBindingType,
    maxAnisotropy?: number,
};

export interface VertexBindingDescription {
    buffer: VertexBuffer,
    visibility?: number,
    isInstanced?: boolean,
}

export interface TextureBindingDescription {
    texture: Texture,
    visibility?: number,
    sampleType?: GPUTextureSampleType,
    viewDimension?: GPUTextureViewDimension,
    multisampled? : boolean,
    asStorage?: boolean,
};

export interface BindingsDescription {
    name?: string,
    range?: Function,
    index?: IndexBindingDescription,
    samplers?: Array<SamplerDescription>,
    indirect?: IndirectBindingDescription,
    uniforms?: Array<UniformBindingDescription>,
    vertices?: Array<VertexBindingDescription>,
    storages?: Array<StorageBindingDescription>,
    textures?: Array<TextureBindingDescription>,
    sharedUniforms?: Array<SharedUniformBindingDescription>,
};

export class Binding {

    indirectBinding: {buffer: GPUBuffer | undefined, byteOffset: number};
    isComplete: boolean;

    constructor();

    static create(description: BindingsDescription): Binding;

    update(): void;

    getIndex(): IndexBuffer | undefined;

    afterShaderComplete(shader: Shader): void;

    // getIndirect(): {buffer: IndirectBuffer | undefined, byteOffset: number};

    getVertexLayouts(): Array<GPUVertexBufferLayout> | undefined;

    getBindGroupLayouts(): GPUBindGroupLayout[];

    createBindGroups(): void;

    getBindGroups(): GPUBindGroup[];

    setVertexBuffers(pass: GPURenderPassEncoder): void

    setBindGroups(pass: GPURenderPassEncoder | GPUComputePassEncoder): void;

    getShader(): GPUShaderModule;

    tryMakeComplete(): boolean;

    destroy(): void;

    release(): null;
}
