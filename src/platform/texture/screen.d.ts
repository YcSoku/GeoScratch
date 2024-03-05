import { Texture } from "../texture/texture";

/**
 * Information about the canvas and its GPU context.
 */
export interface ScreenDescription {
    canvas: HTMLCanvasElement,
    sampleCount?: number,
    depthTest?: boolean,
    alphaMode?: GPUCanvasAlphaMode,
};

/**
 * Represents information about the canvas and its GPU context.
 */
export class Screen {
    canvas: HTMLCanvasElement;
    context: GPUCanvasContext;
    presentationFormat: GPUTextureFormat;
    sampleCount?: number;

    /**
     * Creates an instance of CanvasInfo.
     * @param {ScreenDescription} description - The description object.
     */
    constructor(description: ScreenDescription);

    static create(description: ScreenDescription): Screen;

    /**
     * Resizes the canvas to the display size.
     */
    onWindowResize(): void;

    createScreenDependentTexture(name?: string, format?: GPUTextureFormat, multiplier?: number[]): Texture;

    getCurrentCanvasTexture(): Texture;

    addScreenDependentTexture(texture: Texture, multiplier?: number[]): Screen;

    addScreenDependentElement(element: any): Screen;

    swap(): void;
}
