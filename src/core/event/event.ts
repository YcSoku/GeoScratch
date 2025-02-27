import { EventCallBack } from "../util/types"
import MicroThrottledInvoker from "./MicroThrottledInvoker"

export default class Event {

    id: string
    data: unknown
    invoker: MicroThrottledInvoker
    listeners: Array<EventCallBack>
    taskQueue!: Array<EventCallBack>
    constructor(id: string) {
        this.id = id
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

            // Async one by one
            const process = this.processTask.bind(this)
            this.taskQueue = this.listeners.slice()
            this.invoker.setCallback(process)
            this.invoker.trigger()

            // Async all
            this.invoker.setCallback(() => {
                this.listeners.forEach(cb => {
                    cb(data)
                })
            })
            this.invoker.trigger()
        }
    }

    // ？ 真的有这种需要吗？一个事件的监听器要异步接异步地调用？
    // ？ 如需异步，是否是大家一起在一次异步后同步执行？
    // When asynchronous invoking
    processTask() {

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