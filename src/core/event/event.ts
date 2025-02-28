import { EventCallBack, EventDescription } from "../util/types"
import MicroThrottledInvoker from "./microThrottledInvoker"

export default class Event {

    id: string
    meta: Record<string, unknown>
    data: unknown
    invoker: MicroThrottledInvoker
    listeners: Array<EventCallBack>
    taskQueue!: Array<EventCallBack>
    constructor(eventDescription: EventDescription) {

        this.id = eventDescription.id
        this.meta = eventDescription.meta ?? {}
        this.data = null
        this.listeners = []
        this.invoker = new MicroThrottledInvoker()
    }

    addListener(callback: EventCallBack) {

        this.listeners.push(callback)
    }

    removeListener(callback: EventCallBack) {

        const index = this.listeners.indexOf(callback)
        if (index === -1) {
            console.warn(`Event listener not found`, callback); return
        }
        this.listeners.splice(index, 1)
    }

    emit(data: unknown, async: boolean = false) {

        this.data = data

        if (async === false) {
            this.listeners.forEach(cb => {
                cb(data)
            })
        } else {

            // // Option 1: Async one by one
            // const process = this.processTask.bind(this)
            // this.taskQueue = this.listeners.slice()
            // this.invoker.setCallback(process)
            // this.invoker.trigger()

            // Option 2: Async all in once
            this.invoker.setCallback(() => {
                this.listeners.forEach(cb => {
                    cb(data)
                })
            })
            this.invoker.trigger()
        }
    }

    destroy() {

        this.meta = {}
        this.data = null
        this.taskQueue = []
        this.listeners = []
        this.invoker.remove()
    }

    // ？ When asynchronous invoking one by one
    private processTask() {

        if (this.taskQueue.length === 0) return;

        // Trigger another process call if there's more task to process
        // No matter whatever happens to the result of the task, still trigger 
        if (this.taskQueue.length)
            this.invoker.trigger();

        // FIFO like a queue
        const task = this.taskQueue.shift()!
        task && task(this.data)
    }
    
}