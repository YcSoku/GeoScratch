import ScratchObject from './core/object/object'
export { ScratchObject }

export { Device, StartDash, device } from './platform/context/singletonDevice'

export { Buffer } from './platform/buffer/buffer'
export { vertexBuffer, VertexBuffer } from './platform/buffer/vertexBuffer'
// export { storageBuffer, StorageBuffer } from './platform/buffer/storageBuffer'
export { storageBuffer, StorageBuffer } from './platform/buffer/storageBuffer'
export { uniformBuffer, UniformBuffer } from './platform/buffer/uniformBuffer'
export { indexBuffer, IndexBuffer } from './platform/buffer/indexBuffer'
export { indirectBuffer, IndirectBuffer } from './platform/buffer/indirectBuffer'
export { mapBuffer, MapBuffer } from './platform/buffer/mapBuffer'


export { ArrayRef, aRef } from './core/data/arrayRef'
export { BlockRef, bRef } from './core/data/blockRef'
export { MapRef, mRef } from './core/data/mapRef'
export { boundingBox2D, BoundingBox2D } from './core/box/boundingBox2D'
export { Node2D } from './core/quad/node2D'

export { sampler, Sampler } from './platform/sampler/sampler'
export { texture, Texture } from './platform/texture/texture'
export { screen, Screen } from './platform/texture/screen'
export { shader, Shader } from './platform/shader/shader'

export { binding, Binding } from './platform/binding/binding'

export { renderPipeline, RenderPipeline } from './platform/pipeline/renderPipeline'
export { computePipeline, ComputePipeline } from './platform/pipeline/computePipeline'

export { renderPass, RenderPass } from './platform/pass/renderPass'
export { computePass, ComputePass } from './platform/pass/computePass'

export { director, Director } from './platform/director/director'

export { monitor, Monitor } from './platform/monitor/monitor'

export {
	NoBlending,
	NormalBlending,
	AdditiveBlending, 
	PremultipliedBlending
} from './platform/blending/blending'

export { imageLoader } from './resource/image/imageLoader'
export { shaderLoader } from './resource/shader/shaderLoader'

export { sphere } from './core/geometry/sphere'
export { plane } from './core/geometry/plane'

export {
	i32, asI32, I32,
	u32, asU32, U32,
	f32, asF32, F32,
	vec2i, asVec2i, Vec2i,
	vec2u, asVec2u, Vec2u,
	vec2f, asVec2f, Vec2f,
	vec3f, asVec3f, Vec3f,
	vec4f, asVec4f, Vec4f,
	mat3f, Mat3f,
	mat4f, Mat4f
} from './core/numeric/index'

export { MercatorCoordinate } from './core/geographic/mercatorCoordinate'

export { UUID } from './core/util/util'
