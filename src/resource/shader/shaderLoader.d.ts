import { Shader } from '../../platform/shader/shader'

/**
 * Description for the ImageLoader class.
 */
declare class ShaderLoader {
    load(name: string, url: string): Shader;
}

declare const shaderLoader: ShaderLoader;
export { ShaderLoader, shaderLoader };
