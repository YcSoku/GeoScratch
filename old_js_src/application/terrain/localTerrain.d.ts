import { MapOptions } from '../../core/quadTree/node2D'
import { Binding } from '../../platform/binding/binding'
import { Buffer } from '../../platform/buffer/buffer'
import { RenderPass } from '../../platform/pass/renderPass'
import { RenderPipeline } from '../../platform/pipeline/renderPipeline'

export class LocalTerrain {

    constructor(maxLevel: number): LocalTerrain;

    setResource(gDynamicBuffer: Buffer): LocalTerrain;

    registerRenderableNode(options: MapOptions): void;

    set minVisibleNodeLevel (min: number): void;

    set maxVisibleNodeLevel (max: number): void;

    get minVisibleNodeLevel (): number

    get maxVisibleNodeLevel (): number;

    get prePass(): RenderPass;

    get pipeline(): RenderPipeline;

    get binding(): Binding;
}