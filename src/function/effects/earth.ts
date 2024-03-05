// import { useDeviceStore } from "../../store/device";

// import { sphere } from "./geometry/sphere";
// // import { Material, MaterialDescription } from "./material_m";
// // import { Material, MaterialDescription } from "./include/resource/material/material";
// import { Binding, BindingsDescription } from "./resource/binding/binding";
// import { VertexBuffer } from "./resource/buffer/vertexBuffer";
// import { Vector3 } from "./core/math/Vector3";
// import { Matrix4 } from "./core/math/Matrix4";
// import { DEG2RAD } from "three/src/math/MathUtils";


// async function createTextureByUrl(device: GPUDevice, url: string, name: string = "", format: GPUTextureFormat = "rgba8unorm", usage = GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_DST | GPUTextureUsage.COPY_SRC, flipY = true ) {


//     const textureSource = await fetch(url);
//     const textureBlob = await textureSource.blob();
//     const imageBitmap = await createImageBitmap(textureBlob, {imageOrientation: "none", premultiplyAlpha: "none", colorSpaceConversion: "default"});
    
//     const texture = device.createTexture({
//         label: `Texture (${name})`,
//         format: format,
//         size: [imageBitmap.width, imageBitmap.height],
//         usage: usage
//     });
//     device.queue.copyExternalImageToTexture(
//         {source: imageBitmap, flipY: flipY},
//         {texture: texture},
//         {width: imageBitmap.width, height: imageBitmap.height}
//     );

//     return texture;
// }

// // ---------- CPU-Related Configuration ---------- //

// interface CanvasInfo {
//     canvas: HTMLCanvasElement,
//     context: GPUCanvasContext,
//     presentationFormat: GPUTextureFormat,

//     // - These are filled out in resizeToDisplaySize
//     sampleCount: number,  // can be 1 or 4
//     renderTarget: GPUTexture | undefined,
//     depthTexture: GPUTexture | undefined,
//     renderTargetView: GPUTextureView | undefined,
//     depthTextureView: GPUTextureView | undefined,
// };

// let canvasInfo: CanvasInfo;
// let landBinding: Binding;
// let cloudBinding: Binding;
// let particleBinding: Binding;
// let linkBinding: Binding;

// // Particle - Link
// const particlesData: { velocity: Vector3, numConnections: number; }[] = [];
// let positions: Float32Array, particlePositions: Float32Array, colors: Float32Array, palette: Float32Array, particleColors: Float32Array;

// let timeStep = 0.0;
// let vertexNum = 0;
// let numConnected = 0;

// // Matrix
// let cameraPos = [0.0, 0.0, 1000];
// let target = [0.0, 0.0, 0.0];
// let up = [0.0, 1.0, 0.0];
// let lightPos = [-600, 0.0, 0.0];

// let modelMatrix: Matrix4;
// let viewMatrix: Matrix4;
// let projectionMatrix: Matrix4;
// let normalMatrix: Matrix4;

// let maxConnections = 3;
// let minDistance = 300;
// let maxParticleCount = 350;
// let particleCount = maxParticleCount;
// let radius = 800;
// let rHalf = radius / 2;
// let rLink = rHalf - 100;


// let vertexBuffer_index: VertexBuffer;
// let vertexBuffer_particle_position: VertexBuffer;
// let vertexBuffer_particle_color: VertexBuffer;
// let vertexBuffer_link_position: VertexBuffer;
// let vertexBuffer_link_color: VertexBuffer;

// // ---------- GPU-Related Configuration --------- //

// // WebGPU context
// let device: GPUDevice;
// let canvas: HTMLCanvasElement;
// let context: GPUCanvasContext;

// // Vertex buffer

// let earthRenderPipeline: GPURenderPipeline;
// let earthRenderPipelineLayout: GPUPipelineLayout;

// let cloudRenderPipeline: GPURenderPipeline;
// let cloudRenderPipelineLayout: GPUPipelineLayout;

// let waterRenderPipeline: GPURenderPipeline;

// let particleRenderPipeline: GPURenderPipeline;
// let particleRenderPipelineLayout: GPUPipelineLayout;

// let linkRenderPipeline: GPURenderPipeline;
// let linkRenderPipelineLayout: GPUPipelineLayout;

// let renderPassDescriptor: GPURenderPassDescriptor;

// function resizeToDisplaySize(device: GPUDevice, canvasInfo: CanvasInfo) {

//     const {
//       canvas,
//       renderTarget,
//       presentationFormat,
//       depthTexture,
//       sampleCount,
//     } = canvasInfo;
    
//     let width: number ,height: number;
//     width = Math.max(1, Math.min(device.limits.maxTextureDimension2D, (canvas as HTMLCanvasElement).clientWidth));
//     height = Math.max(1, Math.min(device.limits.maxTextureDimension2D, (canvas as HTMLCanvasElement).clientHeight));

//     const needResize = !canvasInfo.renderTarget ||
//                        width !== canvas.width ||
//                        height !== canvas.height;
//     if (needResize) {
//         if (renderTarget) {
//             renderTarget.destroy();
//         }
//         if (depthTexture) {
//             depthTexture.destroy();
//         }

//         canvas.width = width * window.devicePixelRatio;
//         canvas.height = height * window.devicePixelRatio;

//         if (sampleCount > 1) {
//             const newRenderTarget = device.createTexture({
//                 size: [canvas.width, canvas.height],
//                 format: presentationFormat,
//                 sampleCount,
//                 usage: GPUTextureUsage.RENDER_ATTACHMENT,
//             });
//             canvasInfo.renderTarget = newRenderTarget;
//             canvasInfo.renderTargetView = newRenderTarget.createView();
//         }

//         const newDepthTexture = device.createTexture({
//             size: [canvas.width, canvas.height],
//             format: 'depth24plus',
//             sampleCount,
//             usage: GPUTextureUsage.RENDER_ATTACHMENT,
//         });
//         canvasInfo.depthTexture = newDepthTexture;
//         canvasInfo.depthTextureView = newDepthTexture.createView();
//     }

//     return needResize;
// }

// async function init(_canvas: HTMLCanvasElement) {
//     // Create device for WebGPU
//     device = useDeviceStore().$state.device as GPUDevice;

//     // Create canvas context for WebGPU
//     canvas = _canvas;
//     context = canvas.getContext("webgpu")!;

//     const presentationFormat = navigator.gpu.getPreferredCanvasFormat();
//     context.configure({
//         device: device,
//         format: presentationFormat,
//         alphaMode: "premultiplied"
//     });

//     const depthTexture = device.createTexture({
//         size: [canvas.clientWidth, canvas.clientHeight],
//         format: "depth24plus",
//         usage: GPUTextureUsage.RENDER_ATTACHMENT,
//     });

//     // Make canvas info
//     canvasInfo = {
//         sampleCount: 1,
//         canvas: canvas,
//         context: context,
//         depthTexture: depthTexture,
//         depthTextureView: depthTexture.createView(),
//         renderTarget: undefined,
//         renderTargetView: undefined,
//         presentationFormat: presentationFormat
//     }

//     // Shader code
//     const landShaderCode = await(await fetch("/shaders/land.wgsl")).text();

//     const waterShaderCode = await(await fetch("/shaders/water.wgsl")).text();

//     const cloudShaderCode = await(await fetch("/shaders/cloud.wgsl")).text();

//     const particleShaderCode = await(await fetch("/shaders/point.wgsl")).text();

//     const linkShaderCode = await(await fetch("/shaders/link.wgsl")).text();

//     // Create uniform variable
//     projectionMatrix = new Matrix4();
//     viewMatrix = new Matrix4();
//     modelMatrix = new Matrix4();
//     normalMatrix = new Matrix4();

//     // Create vertex buffer
//     const {indices: indexData, vertices: vertexData, normals: normalData, uvs: uvData} = sphere(rHalf, 64, 32);
//     const indices = new Uint32Array(indexData);
//     const vertices = new Float32Array(vertexData);
//     const normals = new Float32Array(normalData);
//     const uvs = new Float32Array(uvData);
//     vertexNum = indices.length;

//     vertexBuffer_index = VertexBuffer.create(device, {
//         bufferDesc: {
//             name: "Vertex buffer (index)",
//             usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
//             size: indices.byteLength
//         },
//         attributes: [
//             {name: "index", format: "uint32", map: () => indices}
//         ]
//     })

//     const segments = maxParticleCount * maxParticleCount;
//     positions = new Float32Array(segments * 3).fill(0.0);
//     colors = new Float32Array(segments * 4).fill(0.0);
//     palette = new Float32Array(segments * 3).fill(0.0);
//     for (let i = 0; i < colors.length; ++i) {

//         if (Math.floor(i / 3) % 2) {
//             if (i % 3 === 0)
//             palette[i] = 175 / 255;
//             if (i % 3 === 1)
//             palette[i] = 65 / 255;
//             if (i % 3 === 2)
//             palette[i] = 5 / 255;
//         }
//         else {
//             if (i % 3 === 0)
//             palette[i] = 80 / 255;
//             if (i % 3 === 1)
//             palette[i] = 190 / 255;
//             if (i % 3 === 2)
//             palette[i] = 255 / 255;
//         }
//     }
//     // Particles
//     particlePositions = new Float32Array(maxParticleCount * 3);
//     particleColors = (new Float32Array(maxParticleCount * 4));
//     particleColors.forEach((value, index) => {
//         if (index % 4 === 0) particleColors[index] = 250.0 / 255.0;
//         else if (index % 4 === 1) particleColors[index] = 250.0 / 255.0;
//         else if (index % 4 === 2) particleColors[index] = 210.0 / 255.0;
//         else particleColors[index] = 1.0;
//     });

//     for(let i = 0; i < maxParticleCount; i++) {

//         let v = new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1);
//         v = v.normalize().multiplyScalar(rLink);

//         particlePositions[i * 3] = v.x;
//         particlePositions[i * 3 + 1] = v.y;
//         particlePositions[i * 3 + 2] = v.z;

//         particlesData.push({
//             velocity: new Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1),
//             numConnections: 0
//         });
//     }

//     vertexBuffer_particle_position = VertexBuffer.create(device, {
//         bufferDesc: {
//             name: "vertex buffer (particle position)",
//             size: particlePositions.byteLength,
//         },
//         stepMode: "instance",
//         attributes: [
//             {name: "position", format: "float32x3", map: () => particlePositions}
//         ]
//     });

//     vertexBuffer_particle_color = VertexBuffer.create(device, {
//         bufferDesc: {
//             name: "vertex buffer (particle color)",
//             size: particleColors.byteLength,
//         },
//         stepMode: "instance",
//         attributes: [
//             {name: "color", format: "float32x4", map: () => particleColors}
//         ]
//     });

//     vertexBuffer_link_position = VertexBuffer.create(device, {
//         bufferDesc: {
//             name: "vertex buffer (particle position)",
//             size: positions.byteLength
//         },
//         attributes: [
//             {name: "position", format: "float32x3", map: () => positions}
//         ]
//     });

//     vertexBuffer_link_color = VertexBuffer.create(device, {
//         bufferDesc: {
//             name: "vertex buffer (particle color)",
//             size: colors.byteLength
//         },
//         attributes: [
//             {name: "color", format: "float32x4", map: () => colors}
//         ]
//     });

//     const edTexture = await createTextureByUrl(device, "/images/Earth/earth.jpg", "earth day shader");
//     const enTexture = await createTextureByUrl(device, "/images/Earth/earth-night.jpg", "earth day shader");
//     const esTexture = await createTextureByUrl(device, "/images/Earth/earth-specular.jpg", "earth specular shader");
//     const lmTexture = await createTextureByUrl(device, "/images/Earth/mask-land.jpg", "land mask shader");
//     const emTexture = await createTextureByUrl(device, "/images/Earth/earth-selfillumination.jpg", "emission shader");
//     const cdTexture = await createTextureByUrl(device, "/images/Earth/cloud.jpg", "cloud day shader");
//     const cnTexture = await createTextureByUrl(device, "/images/Earth/cloud-night.jpg", "cloud night shader");
//     const cmTexture = await createTextureByUrl(device, "/images/Earth/cloud-alpha.jpg", "cloud mask shader");

//     // Earth Binding description
//     const landBindingDescription: BindingsDescription = {

//         shader: {
//             name: "gawEarth land shader",
//             code: landShaderCode
//         },
//         uniforms: [
//             {
//                 dynamic: true,
//                 name: "DynamicUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     projection: () => projectionMatrix.elements,
//                     view: () => viewMatrix.elements,
//                     model: () => modelMatrix.elements,
//                     normal: () => normalMatrix.elements,
//                     delta: () => timeStep,
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "StaticUniformBlock",
//                 map: {
//                     radius: () => rHalf,
//                     nightAlphaTest: () => 0.3,
//                 },
//             },
//             {
//                 dynamic: true,
//                 name: "LightUniformBlock",
//                 map: {
//                     position: () => lightPos,
//                     color: () => [1.0, 1.0, 1.0],
//                     intensity: () => 6.0,
//                     viewPos: () => cameraPos,
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "MaterialUniformBlock",
//                 map: {
//                     ambient: () => [0.4, 0.4, 0.4],
//                     diffuse: () => [1.0, 1.0, 1.0],
//                     specular: () => [1.0, 1.0, 1.0],
//                     shininess: () => 16,
//                     emissive: () => 1,
//                 },
//             }
//         ],
//         storages: [
//             {
//                 name: "position",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => vertices
//             },
//             {
//                 name: "uv",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => uvs
//             },
//             {
//                 name: "normal",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => normals
//             }
//         ],
//         samplers: [
//             {
//                 name: "linear",
//                 addressModeUVW: ["repeat", "repeat"],
//                 filterMinMag: ["linear", "linear"],
        
//                 visibility: GPUShaderStage.FRAGMENT,
//                 bindingType: "filtering"
//             }
//         ],
//         textures: [
//             { texture: edTexture },
//             { texture: enTexture },
//             { texture: esTexture },
//             { texture: lmTexture },
//             { texture: emTexture },
//         ]
//     };

//     // Cloud binding
//     const cloudBindingDescription: BindingsDescription = {

//         shader: {
//             name: "gawEarth cloud shader",
//             code: cloudShaderCode
//         },
//         uniforms: [
//             {
//                 dynamic: true,
//                 name: "DynamicUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     projection: () => projectionMatrix.elements,
//                     view: () => viewMatrix.elements,
//                     model: () => modelMatrix.elements,
//                     normal: () => normalMatrix.elements,
//                     delta: () => timeStep,
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "StaticUniformBlock",
//                 map: {
//                     radius: () => rHalf,
//                     nightAlphaTest: () => 0.3,
//                     opacity: () => 0.6,
//                 },
//             },
//             {
//                 dynamic: true,
//                 name: "LightUniformBlock",
//                 map: {
//                     position: () => lightPos,
//                     color: () => [1.0, 1.0, 1.0],
//                     intensity: () => 6.0,
//                     viewPos: () => cameraPos,
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "MaterialUniformBlock",
//                 map: {
//                     ambient: () => [0.8, 0.8, 0.8],
//                     diffuse: () => [1.0, 1.0, 1.0],
//                     specular: () => [1.0, 1.0, 1.0],
//                     shininess: () => 16,
//                     emissive: () => 1,
//                 },
//             }
//         ],
//         storages: [
//             {
//                 name: "position",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => vertices
//             },
//             {
//                 name: "uv",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => uvs
//             },
//             {
//                 name: "normal",
//                 usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
//                 offset: 0,
//                 visibility: GPUShaderStage.VERTEX,
//                 type: "read-only-storage",
//                 resource: () => normals
//             }
//         ],
//         samplers: [
//             {
//                 name: "linear",
//                 addressModeUVW: ["repeat", "repeat"],
//                 filterMinMag: ["linear", "linear"],
        
//                 visibility: GPUShaderStage.FRAGMENT,
//                 bindingType: "filtering"
//             }
//         ],
//         textures: [
//             { texture: cdTexture },
//             { texture: cnTexture },
//             { texture: cmTexture }
//         ]
//     };

//     // Particle binding description
//     const particleBindingDescription: BindingsDescription = {

//         shader: {
//             name: "earth core particle shader",
//             code: particleShaderCode
//         },
//         uniforms: [
//             {
//                 dynamic: true,
//                 name: "DynamicUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     projection: () => projectionMatrix.elements,
//                     view: () => viewMatrix.elements,
//                     viewPort: () => [canvasInfo.canvas.width, canvasInfo.canvas.height],
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "StaticUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     size: () => 32.0,
//                 },
//             },
//         ],
//     };

//     // Particle binding description
//     const linkBindingDescription: BindingsDescription = {

//         shader: {
//             name: "earth core link shader",
//             code: linkShaderCode
//         },
//         uniforms: [
//             {
//                 dynamic: true,
//                 name: "DynamicUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     projection: () => projectionMatrix.elements,
//                     view: () => viewMatrix.elements,
//                     viewPort: () => [canvasInfo.canvas.width, canvasInfo.canvas.height],
//                 },
//             },
//             {
//                 dynamic: false,
//                 name: "StaticUniformBlock",
//                 visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
//                 map: {
//                     size: () => 32.0,
//                 },
//             },
//         ],
//     };

//     // Create Binding
//     landBinding = Binding.create(device, landBindingDescription);
//     cloudBinding = Binding.create(device, cloudBindingDescription);
//     particleBinding = Binding.create(device, particleBindingDescription);
//     linkBinding = Binding.create(device, linkBindingDescription);

//     // Create render pipeline layout
//     earthRenderPipelineLayout = device.createPipelineLayout({
//         label: "rendering pipeline layout",
//         bindGroupLayouts: landBinding.getBindGroupLayouts()
//     });
//     cloudRenderPipelineLayout = device.createPipelineLayout({
//         label: "rendering pipeline layout for cloud",
//         bindGroupLayouts: cloudBinding.getBindGroupLayouts()
//     });
//     particleRenderPipelineLayout = device.createPipelineLayout({
//         label: "rendering pipeline layout for particles",
//         bindGroupLayouts: particleBinding.getBindGroupLayouts()
//     });
//     linkRenderPipelineLayout = device.createPipelineLayout({
//         label: "rendering pipeline layout for links",
//         bindGroupLayouts: linkBinding.getBindGroupLayouts()
//     });

//     // Create rendering pipeline
//     earthRenderPipeline = device.createRenderPipeline({
//         label: "rendering pipeline",
//         layout: earthRenderPipelineLayout,
//         vertex: {
//             module: landBinding.getShader(),
//             entryPoint: "vMain",
//             buffers: [
//                 vertexBuffer_index.getAttributeLayout(0)
//             ]
//         },
//         fragment: {
//             module: landBinding.getShader(),
//             entryPoint: "fMain",
//             targets: [
//                 {
//                     format: presentationFormat,
//                     blend: {
//                         color: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one-minus-src-alpha"
//                         },
//                         alpha: {
//                             operation: "add",
//                             srcFactor: "one",
//                             dstFactor: "one-minus-src-alpha"
//                         }
//                     },
//                     writeMask: GPUColorWrite.ALL
//                 }
//             ]
//         },
//         primitive: {
//             topology: "triangle-list",
//         },
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: "less",
//             format: "depth24plus"
//         },
//     });


//     const waterShader = device.createShaderModule({
//         label: "Water shader",
//         code: waterShaderCode
//     });
//     waterRenderPipeline = device.createRenderPipeline({
//         label: "water rendering pipeline",
//         layout: earthRenderPipelineLayout,
//         vertex: {
//             module: waterShader,
//             entryPoint: "vMain",
//             buffers: [
//                 vertexBuffer_index.getAttributeLayout(0)
//             ]
//         },
//         fragment: {
//             module: waterShader,
//             entryPoint: "fMain",
//             targets: [
//                 {
//                     format: presentationFormat,
//                     blend: {
//                         color: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one-minus-src-alpha"
//                         },
//                         alpha: {
//                             operation: "add",
//                             srcFactor: "one",
//                             dstFactor: "one-minus-src-alpha"
//                         }
//                     },
//                     writeMask: GPUColorWrite.ALL
//                 }
//             ]
//         },
//         primitive: {
//             topology: "triangle-list",
//             cullMode: "back"
//         },
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: "less",
//             format: "depth24plus"
//         },
//     });

//     // Create rendering pipeline
//     cloudRenderPipeline = device.createRenderPipeline({
//         label: "rendering pipeline for cloud",
//         layout: cloudRenderPipelineLayout,
//         vertex: {
//             module: cloudBinding.getShader(),
//             entryPoint: "vMain",
//             buffers: [
//                 vertexBuffer_index.getAttributeLayout(0)
//             ]
//         },
//         fragment: {
//             module: cloudBinding.getShader(),
//             entryPoint: "fMain",
//             targets: [
//                 {
//                     format: presentationFormat,
//                     blend: {
//                         color: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one"
//                         },
//                         alpha: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one"
//                         }
//                     },
//                     writeMask: GPUColorWrite.ALL
//                 }
//             ]
//         },
//         primitive: {
//             topology: "triangle-list",
//         },
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: "less",
//             format: "depth24plus"
//         },
//     });

//     particleRenderPipeline = device.createRenderPipeline({
//         label: "rendering pipeline for particles",
//         layout: particleRenderPipelineLayout,
//         vertex: {
//             module: particleBinding.getShader(),
//             entryPoint: "vMain",
//             buffers: [
//                 vertexBuffer_particle_position.getAttributeLayout(0),
//                 vertexBuffer_particle_color.getAttributeLayout(1),
//             ]
//         },
//         fragment: {
//             module: particleBinding.getShader(),
//             entryPoint: "fMain",
//             targets: [
//                 {
//                     format: presentationFormat,
//                     blend: {
//                         color: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one-minus-src-alpha"
//                         },
//                         alpha: {
//                             operation: "add",
//                             srcFactor: "one",
//                             dstFactor: "one-minus-src-alpha"
//                         }
//                     },
//                     writeMask: GPUColorWrite.ALL
//                 }
//             ]
//         },
//         primitive: {
//             topology: "triangle-strip",
//         },
//         depthStencil: {
//             depthWriteEnabled: false,
//             depthCompare: "less",
//             format: "depth24plus"
//         },
//     });

//     linkRenderPipeline = device.createRenderPipeline({
//         label: "rendering pipeline for particles",
//         layout: linkRenderPipelineLayout,
//         vertex: {
//             module: linkBinding.getShader(),
//             entryPoint: "vMain",
//             buffers: [
//                 vertexBuffer_link_position.getAttributeLayout(0),
//                 vertexBuffer_link_color.getAttributeLayout(1),
//             ]
//         },
//         fragment: {
//             module: linkBinding.getShader(),
//             entryPoint: "fMain",
//             targets: [
//                 {
//                     format: presentationFormat,
//                     blend: {
//                         color: {
//                             operation: "add",
//                             srcFactor: "src-alpha",
//                             dstFactor: "one-minus-src-alpha"
//                         },
//                         alpha: {
//                             operation: "add",
//                             srcFactor: "one",
//                             dstFactor: "one-minus-src-alpha"
//                         }
//                     },
//                     writeMask: GPUColorWrite.ALL
//                 }
//             ]
//         },
//         primitive: {
//             topology: "line-strip",
//         },
//         depthStencil: {
//             depthWriteEnabled: true,
//             depthCompare: "less",
//             format: "depth24plus"
//         },
//     });

//     renderPassDescriptor = {
//         label: "render pass",
//         colorAttachments: [
//             {
//                 view: context.getCurrentTexture().createView(),
//                 resolveTarget: undefined,
//                 clearValue: [0.0, 0.0, 0.0, 1.0],
//                 loadOp: "clear",
//                 storeOp: "store"
//             }
//         ],
//         depthStencilAttachment: {
//             view: canvasInfo.depthTextureView!,
//             depthClearValue: 1.0,
//             depthLoadOp: "clear",
//             depthStoreOp: "store"
//         }
//     };
// }

// function tickLogic() {

//     timeStep -= 0.0005;

//     projectionMatrix.perspective(45, canvasInfo.context.canvas.width / canvasInfo.context.canvas.height, 1.0, 4000.0);
//     viewMatrix.lookAt(new Vector3(...cameraPos), new Vector3(...target), new Vector3(...up))
//     .makeTranslation(cameraPos[0], cameraPos[1], cameraPos[2])
//     .invert();
//     // modelMatrix.makeRotationZ(DEG2RAD * -23.0);
//     modelMatrix.makeRotationX(DEG2RAD * 32.0);
//     normalMatrix = modelMatrix.invert().transpose();

//     lightPos = [-600, 0.0, 0.0];
//     lightPos = new Vector3(lightPos[0], lightPos[1], lightPos[2]).applyMatrix4(new Matrix4().makeRotationZ(DEG2RAD * -23.0)).toArray();


//     for (let i = 0; i < particleCount; i++) {
//         particlesData[i].numConnections = 0;
//     }

//     for (let i = 0; i < particleCount; i++) {
//         const particleData = particlesData[i];
//         const x = particlePositions[i * 3 + 0];
//         const y = particlePositions[i * 3 + 1];
//         const z = particlePositions[i * 3 + 2];
//         let v = new Vector3(x, y, z).normalize();
//         v = v.applyAxisAngle((new Vector3(particleData.velocity.x, particleData.velocity.y, particleData.velocity.z)).normalize(), 0.001).multiplyScalar(rLink);

//         particlePositions[i * 3 + 0] = v.x;
//         particlePositions[i * 3 + 1] = v.y;
//         particlePositions[i * 3 + 2] = v.z;
//     }

//     let vertexpos = 0;
//     let colorpos = 0;
//     let palettepos = 0;
//     numConnected = 0;
//     for (let i = 0; i < particleCount; i++) {
//         const particleData = particlesData[i];
//         // if (particleData.numConnections >= maxConnections) continue;

//         // Check collision
//         for (let j = i + 1; j < particleCount; j++) {

//             const particleDataB = particlesData[j];
//             // if (particleDataB.numConnections >= maxConnections)
//             //     continue;

//             const dx = particlePositions[i * 3 + 0] - particlePositions[j * 3 + 0];
//             const dy = particlePositions[i * 3 + 1] - particlePositions[j * 3 + 1];
//             const dz = particlePositions[i * 3 + 2] - particlePositions[j * 3 + 2];
//             const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

//             if (dist < minDistance) {

//                 particleData.numConnections++;
//                 particleDataB.numConnections++;

//                 let alpha = (1.0 - dist / minDistance);

//                 positions[vertexpos++] = particlePositions[i * 3 + 0];
//                 positions[vertexpos++] = particlePositions[i * 3 + 1];
//                 positions[vertexpos++] = particlePositions[i * 3 + 2];

//                 positions[vertexpos++] = particlePositions[j * 3 + 0];
//                 positions[vertexpos++] = particlePositions[j * 3 + 1];
//                 positions[vertexpos++] = particlePositions[j * 3 + 2];

//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = alpha;

//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = palette[palettepos++];
//                 colors[colorpos++] = alpha;

//                 numConnected++;
//             }
//         }
//     }

//     vertexBuffer_particle_position.attributes["position"].dirty = true;
//     vertexBuffer_link_position.attributes["position"].dirty = true;
//     vertexBuffer_link_color.attributes["color"].dirty = true;

//     landBinding.update();
//     cloudBinding.update();
//     particleBinding.update();
//     linkBinding.update();

//     vertexBuffer_index.update();
//     vertexBuffer_particle_position.update();
//     vertexBuffer_particle_color.update();
//     vertexBuffer_link_position.update();
//     vertexBuffer_link_color.update();
// }

// function rendering() {

//     tickLogic();

//     // Resize canvas if needed
//     if (resizeToDisplaySize(device, canvasInfo)) {
//         if (canvasInfo.sampleCount === 1) {
//             const colorTexture = context.getCurrentTexture();
//             (renderPassDescriptor.colorAttachments as any)[0].view = colorTexture.createView();
//         } else {
//             (renderPassDescriptor.colorAttachments as any)[0].view = canvasInfo.renderTargetView;
//             (renderPassDescriptor.colorAttachments as any)[0].resolveTarget = context.getCurrentTexture().createView();
//         }
//         (renderPassDescriptor.depthStencilAttachment as any).view = canvasInfo.depthTextureView!;
//     }

//     const encoder = device.createCommandEncoder({label: "Rendering Test Encoder"});

//     // Render pass for land
//     const renderPass = encoder.beginRenderPass(renderPassDescriptor);
//     renderPass.setBlendConstant([0.0, 0.0, 0.0, 1.0]);


//     // Draw land
//     landBinding.setBindGroups(renderPass);
//     renderPass.setVertexBuffer(0, vertexBuffer_index.buffer);
//     renderPass.setPipeline(earthRenderPipeline);
//     renderPass.draw(vertexNum);

//     // Draw particles
//     particleBinding.setBindGroups(renderPass);
//     renderPass.setVertexBuffer(0, vertexBuffer_particle_position.buffer);
//     renderPass.setVertexBuffer(1, vertexBuffer_particle_color.buffer);

//     renderPass.setPipeline(particleRenderPipeline);
//     renderPass.draw(4, particleCount);

//     // Draw links
//     linkBinding.setBindGroups(renderPass);
//     renderPass.setVertexBuffer(0, vertexBuffer_link_position.buffer);
//     renderPass.setVertexBuffer(1, vertexBuffer_link_color.buffer);

//     renderPass.setPipeline(linkRenderPipeline);
//     renderPass.draw(2 * numConnected);

//     // Draw water
//     landBinding.setBindGroups(renderPass);
//     renderPass.setVertexBuffer(0, vertexBuffer_index.buffer);
    
//     renderPass.setPipeline(waterRenderPipeline);
//     renderPass.draw(vertexNum);

//     // Draw cloud
//     cloudBinding.setBindGroups(renderPass);

//     renderPass.setPipeline(cloudRenderPipeline);
//     renderPass.draw(vertexNum);


//     renderPass.end();

//     device.queue.submit([encoder.finish()]);

//     requestAnimationFrame(rendering);
// }

// function destroy() {

//     canvasInfo.context.getCurrentTexture().destroy();
//     canvasInfo.depthTexture?.destroy();

//     landBinding.destroy();
//     cloudBinding.destroy();
//     particleBinding.destroy();

// }

// export {
//     init,
//     rendering,
//     destroy,
// }