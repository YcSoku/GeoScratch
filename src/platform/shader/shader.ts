import ScratchObject from "../../core/object/object";
import { director } from "../director/director";

export interface ShaderDescription {
    name: string;
    codeFunc: Function;
}

export class Shader extends ScratchObject {
    private code: Function;
    shaderModule: GPUShaderModule | undefined;

    constructor(description: ShaderDescription) {
        super();
        this.name = description.name;
        this.shaderModule = undefined;
        this.code = description.codeFunc;
        this.code() && this.needUpdate();
    }

    static create(description: ShaderDescription): Shader {
        return new Shader(description);
    }

    needUpdate(): void {
        director.addToUpdateList(this);
    }

    exportDescriptor(): GPUShaderModuleDescriptor {
        return {
            label: this.name,
            code: this.code()
        };
    }

    /**
     * @deprecated
     */
    update(): void {
        director.dispatchEvent({ type: 'createShader', emitter: this });
    }

    isComplete(): boolean {
        return !!this.shaderModule;
    }

    destroy(): void {
        this.code = null as any;
        this.shaderModule = null as any;
        super.destroy();
    }
}

export function shader(description: ShaderDescription): Shader {
    return Shader.create(description);
}