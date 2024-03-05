import { Texture, TextureDescription } from "../../platform/texture/texture";

/**
 * Description for the ImageLoader class.
 */
class ImageLoader {

    /**
     * Index of the worker.
     */
    private workerIndex: number;

    /**
     * Array to store image resources.
     */
    private imageResource: ImageBitmap[];

    /**
     * Load an image with the specified description.
     * @param {ImageLoaderDescription} desc - The image loader description.
     * @returns {Texture} - The created texture.
     */
    load(name: string, url: string, mipMapped?: boolean, targetFormat = 'rgba8unorm'): Texture;
}

/**
 * Description for the ImageLoader class.
 */
interface ImageLoaderDescription {
    /**
     * Texture description for the image loader.
     */
    textureDesc: TextureDescription;

    /**
     * URL of the image to load.
     */
    url: string;
}

const imageLoader: ImageLoader;
export default imageLoader;
export { ImageLoader, ImageLoaderDescription };
