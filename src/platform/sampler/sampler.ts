import ScratchObject from '../../core/object/object'
import { director } from '../director/director'

export interface SamplerCreateDescription {
    name: string,
    mipmap?: GPUMipmapFilterMode,
    maxAnisotropy?: number,
    filterMinMag: [GPUFilterMode, GPUFilterMode],
    addressModeUVW: [GPUAddressMode, GPUAddressMode?, GPUAddressMode?],
}

export class Sampler extends ScratchObject {

    private minFilter: GPUFilterMode
    private magFilter: GPUFilterMode
    private addressModeU: GPUAddressMode
    private addressModeV: GPUAddressMode
    private addressModeW: GPUAddressMode
    private mipmapFilter?: GPUMipmapFilterMode
    private maxAnisotropy?: number
    private device?: GPUDevice
    private _sampler?: GPUSampler

    constructor(description: SamplerCreateDescription) {

        super(description.name)
        this.minFilter = description.filterMinMag.length > 0 ? description.filterMinMag[0] : 'linear'
        this.magFilter = description.filterMinMag.length > 1 ? description.filterMinMag[1] : 'linear'
        this.addressModeU = description.addressModeUVW.length > 0 ? description.addressModeUVW[0] : 'repeat'
        this.addressModeV = description.addressModeUVW.length > 1 ? description.addressModeUVW[1]! : 'repeat'
        this.addressModeW = description.addressModeUVW.length > 2 ? description.addressModeUVW[2]! : 'repeat'
        this.mipmapFilter = description.mipmap
        this.maxAnisotropy = description.maxAnisotropy
        this.refCount = 0
        this.device = undefined
        this._sampler = undefined

        this.needUpdate()
    }

    static create(description: SamplerCreateDescription): Sampler {
        return new Sampler(description)
    }

    get sampler(): GPUSampler | undefined {
        return this._sampler
    }

    set sampler(sampler: GPUSampler | undefined) {
        if (sampler instanceof GPUSampler) this._sampler = sampler
        else console.warn('ERROR::THE_SAMPLER_GETTED_IS_NOT_INSTANCE_OF_GPUSampler')
    }

    exportDescriptor(): GPUSamplerDescriptor {
        return {
            label: this.name,
            minFilter: this.minFilter,
            magFilter: this.magFilter,
            addressModeU: this.addressModeU,
            addressModeV: this.addressModeV,
            addressModeW: this.addressModeW,
            mipmapFilter: this.mipmapFilter,
            maxAnisotropy: this.maxAnisotropy,
        }
    }

    /**
     * @deprecated
     */
    update(): void {
        director.dispatchEvent({ type: 'createSampler', emitter: this })
    }

    needUpdate(): void {
        director.addToUpdateList(this)
    }

    destroy(): void {
        // @ts-ignore
        this.maxAnisotropy = undefine; this.addressModeU = undefine; this.addressModeV = undefine; this.addressModeW = undefine;
        // @ts-ignore
        this.mipmapFilter = undefine; this._sampler = undefine; this.minFilter = undefine; this.magFilter = undefine;
        // @ts-ignore
        this.refCount = undefine; this.device = undefine; this.name = undefine

        super.destroy()
    }
}

export function sampler(description: SamplerCreateDescription): Sampler {
    return Sampler.create(description)
}