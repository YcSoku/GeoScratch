import { SamplerDescription } from "../binding/binding";
// /**
//  * @typedef {Object} SamplerDescription
//  * @property {string} name
//  * @property {number} [mipmap]
//  * @property {number} [maxAnisotropy]
//  * @property {Array<GPUFilterMode>} filterMinMag
//  * @property {Array<GPUAddressMode>} addressModeUVW
//  */

export interface SamplerCreateDescription {
    name: string,
    mipmap?: number,
    maxAnisotropy?: number,
    filterMinMag: [GPUFilterMode, GPUFilterMode],
    addressModeUVW: [GPUAddressMode, GPUAddressMode],
}

export class Sampler {

    static create(description: SamplerDescription): Sampler;
    update(): void;
    use(): Sampler;
    release(): null;
    get sampler(): GPUSampler;
    set sampler(sampler: GPUSampler);
    exportDescriptor(): GPUSamplerDescriptor;
}

export function sampler(description: SamplerCreateDescription): Sampler;