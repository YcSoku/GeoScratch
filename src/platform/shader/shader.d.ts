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

    update(): void;

    isComplete(): boolean;
}
