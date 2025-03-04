import * as scr from '../../src/scratch'

const code = `
    Struct Input {
        @builtin(workgroup_id) workgroup_id : vec3<u32>,
        @builtin(local_invocation_id) local_invocation_id : vec3<u32>,
        @builtin(global_invocation_id) global_invocation_id : vec3<u32>,
        @builtin(local_invocation_index) local_invocation_index: u32,
        @builtin(num_workgroups) num_workgroups: vec3<u32>
    };
  
    @group(0) @binding(0) var<storage, read_write> workgroupResult: array<vec3u>;
    @group(0) @binding(1) var<storage, read_write> localResult: array<vec3u>;
    @group(0) @binding(2) var<storage, read_write> globalResult: array<vec3u>;

    const vec3u workgroupSize = vec3u(3, 4, 2);

    @compute @workgroup_size(workgroupSize) 
    fn computeSomething(input: Input) {
        // workgroup_index is similar to local_invocation_index except for
        // workgroups, not threads inside a workgroup.
        // It is not a builtin so we compute it ourselves.

        let workgroup_index =  
            input.workgroup_id.x +
            input.workgroup_id.y * input.num_workgroups.x +
            input.workgroup_id.z * input.num_workgroups.x * input.num_workgroups.y;

        // global_invocation_index is like local_invocation_index
        // except linear across all invocations across all dispatched
        // workgroups. It is not a builtin so we compute it ourselves.

        let global_invocation_index =
            input.workgroup_index * 24 + input.local_invocation_index;

        workgroupResult[global_invocation_index] = input.workgroup_id;
        localResult[global_invocation_index] = input.local_invocation_id;
        globalResult[global_invocation_index] = input.global_invocation_id;
    }
`;



const main = function () {

    const data = [1.0, 2.0, 3.0, 4.0, 5.0]

    const storageBuffer = scr.storageBuffer({
        name: 'storage buffer test',
        usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
        resource: { size: data.length * 4 }
    })

    const srcArrayRef = scr.aRef(new Float32Array(data))
    const dstArrayRef = scr.aRef(new Float32Array(data.length))

    const computePipeline = scr.computePipeline({
        name: 'compute - pipeline',
        constants: {},
        shader: {
            module: scr.shader({ name: 'compute - shader', codeFunc: () => code }),
            csEntryPoint: 'computeSomething'
        }
    })

    const compueBinding = scr.binding({
        name: 'compute - binding',
        range: () => [4, 3, 2],
        storages: [

        ]
    })

}


export default () => {
    scr.StartDash().then(() => {
        main()
    })
}