class Device {

    gpuDevice: GPUDevice
    private static _instance: Device | undefined
    private retryCount: number = 0
    private maxRetries: number = 3

    private constructor() {
        // Do nothing 
    }

    static async instance(): Promise<Device> {
        if (!Device._instance) {
            Device._instance = new Device()
            await Device._instance.init()
        }
        return Device._instance
    }

    private async init() {
        if (!navigator.gpu) {
            console.error("ERROR:: this browser does not support WebGPU")
            return
        }

        const adapter = await navigator.gpu.requestAdapter()
        if (!adapter) {
            console.error("ERROR:: this browser supports WebGPU but it appears disabled")
            return
        }

        const adapterFeatures = adapter.features
        // Iterate through all the set values using values()
        console.log("Features supported by the adapter")
        for (const value of adapterFeatures.values()) {
            console.log(value)
        }

        this.gpuDevice = await adapter.requestDevice()
        this.gpuDevice.lost.then((info) => {
            console.error(`ERROR:: WebGPU device was lost: ${info.message}`)
            if (info.reason !== "destroyed" && this.retryCount < this.maxRetries) {
                console.log("Reinitializing...")
                this.init()  // Init again
            }
        })

        console.log(this.gpuDevice)
    }
}

let device: GPUDevice
async function StartDash() {
    device = (await Device.instance()).gpuDevice
    return device
}

export {
    StartDash,
    device,
    Device
}