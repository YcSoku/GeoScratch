import { TypedArray } from 'webgpu-utils';
import * as scr from '../../src/scratch'

const code = `
    // All useful builtin attributes in compute shader
    struct Input {
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
    };
  
    @group(0) @binding(0) var<storage, read_write> workgroupResult: array<vec3u>;
    @group(0) @binding(1) var<storage, read_write> localResult: array<vec3u>;
    @group(0) @binding(2) var<storage, read_write> globalResult: array<vec3u>;

    // Override constants 
    override blockSizeX = 1;
    override blockSizeY = 1;
    override blockSizeZ = 1;

    @compute @workgroup_size(blockSizeX, blockSizeY, blockSizeZ) 
    fn computeSomething(input: Input) {

        let workgroup_index =  
            input.workgroup_id.x +
            input.workgroup_id.y * input.num_workgroups.x +
            input.workgroup_id.z * input.num_workgroups.x * input.num_workgroups.y;

        let threadNum = u32(blockSizeX * blockSizeY * blockSizeZ);

        let global_invocation_index =
            workgroup_index * threadNum + input.local_invocation_index;

        workgroupResult[global_invocation_index] = input.workgroup_id;
        localResult[global_invocation_index] = input.local_invocation_id;
        globalResult[global_invocation_index] = input.global_invocation_id;
    }
`;

const main = function () {

    const workGroupCount = [2, 2, 2]
    const threadPerWorkGroup = [3, 3, 3]
    const threadNumPerWorkGroup = threadPerWorkGroup.reduce((a, b) => a * b);
    const toalThreadNum = workGroupCount.reduce((a, b) => a * b) * threadNumPerWorkGroup;

    const bufferSize = toalThreadNum * 4 * 4 // vec3u in bytes , vec3u allign to 4 bytes!

    const workgroupResultBuffer = scr.storageBuffer({
        name: 'workgroupResultBuffer',
        resource: { size: bufferSize },
        willMap: true
    })
    const localResultBuffer = scr.storageBuffer({
        name: 'localResultBuffer',
        resource: { size: bufferSize },
        willMap: true
    })
    const globalResultBuffer = scr.storageBuffer({
        name: 'globalResultBuffer',
        resource: { size: bufferSize },
        willMap: true
    })

    const computePipeline = scr.computePipeline({
        name: 'compute - pipeline',
        constants: {
            'blockSizeX': threadPerWorkGroup[0],
            'blockSizeY': threadPerWorkGroup[1],
            'blockSizeZ': threadPerWorkGroup[2],
        },
        shader: {
            module: scr.shader({ name: 'compute - shader', codeFunc: () => code }),
            csEntryPoint: 'computeSomething'
        }
    })
    const compueBinding = scr.binding({
        name: 'compute - binding',
        range: () => [...workGroupCount], // workgroup num x, y, z
        storages: [
            { buffer: workgroupResultBuffer, writable: true },
            { buffer: localResultBuffer, writable: true },
            { buffer: globalResultBuffer, writable: true }
        ]
    })
    const computePass = scr.computePass({
        name: 'compute - pass',
    }).add(computePipeline, compueBinding)

    scr.director.addStage({
        name: 'compute - workgroup - stage',
        items: [computePass]
    })

    const workgroupBufferMapRef = scr.mRef({
        mapTarget: workgroupResultBuffer,
        range: { offset: 0, lenght: toalThreadNum * 4 },
        elementType: 'U32'
    })
    const localBufferMapRef = scr.mRef({
        mapTarget: localResultBuffer,
        range: { offset: 0, lenght: toalThreadNum * 4 },
        elementType: 'U32'
    })
    const globalBufferMapRef = scr.mRef({
        mapTarget: globalResultBuffer,
        range: { offset: 0, lenght: toalThreadNum * 4 },
        elementType: 'U32'
    })

    scr.director.tick()

    setTimeout(async () => {
        scr.director.tick()

        const data = await new Promise<any>(async (resolve, reject) => {

            let workgroupIDRefData, localIDRefData, globalIDRefData
            workgroupIDRefData = viewAsVec3(await workgroupBufferMapRef.rangeRead(0, bufferSize / 4, 'U32'))
            localIDRefData = viewAsVec3(await localBufferMapRef.rangeRead(0, bufferSize / 4, 'U32'))
            globalIDRefData = viewAsVec3(await globalBufferMapRef.rangeRead(0, bufferSize / 4, 'U32'))

            resolve({
                workgroupIDRefData,
                localIDRefData,
                globalIDRefData
            })
        })

        const viewData = []
        for (let i = 0; i < data.workgroupIDRefData.length; i++) {
            viewData.push({
                index: i,
                workgroupID: data.workgroupIDRefData[i],
                localID: data.localIDRefData[i],
                globalID: data.globalIDRefData[i]
            })
        }
        console.log(viewData)

    }, 100);

}

export default () => {
    scr.StartDash().then(() => {
        main()
    })
}

/////// helpers //////////////////////////////////

function viewAsVec3(data: TypedArray) {
    const vec3s = []
    for (let i = 0; i < data.length; i += 4) {
        vec3s.push([data[i], data[i + 1], data[i + 2]])
    }
    return vec3s
}