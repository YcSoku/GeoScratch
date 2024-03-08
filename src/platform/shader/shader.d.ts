export interface ShaderDescription {
    name: string,
    codeFunc: Function,
}

export class Shader {

    name: string;
    code: string;
    shaderModule: GPUShaderModule | undefined;
    dirty: boolean;
    defs: any;

    constructor(description: ShaderDescription);
    static create(description: ShaderDescription): Shader;

    /**
     * @deprecated
     * @param device 
     */
    update(device: GPUDevice): void;

    isComplete(): boolean;
    exportDescriptor(): GPUShaderModuleDescriptor;
}

export function shader(description: ShaderDescription): Shader;
