import Event from "./event"
import { EventCallBack } from "../util/types"

class EventBus {

    private listeners: Map<string, Array<EventCallBack>> = new Map()
    private static instance: EventBus | null = null
    constructor() {
    }
    public static getInstance(): EventBus {
        if (!EventBus.instance) EventBus.instance = new EventBus()
        return EventBus.instance
    }

    on(eventType: string, callback: EventCallBack): void {

        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, [])
        }
        this.listeners.get(eventType)!.push(callback)
    }

    off(eventType: string, callback: EventCallBack): void {

        if (!this.listeners.has(eventType)) {
            console.warn(`Event *${eventType}* not Found`); return
        }

        const callbacks = this.listeners.get(eventType)!
        const index = callbacks.indexOf(callback)
        if (index > -1)
            this.listeners.get(eventType)!.splice(index, 1)

        if (this.listeners.get(eventType)!.length === 0) {
            this.listeners.delete(eventType)
        }
    }

    emit(eventType: string, data: unknown, async: boolean = false) {

        if (!this.listeners.has(eventType)) {
            console.warn(`Event *${eventType}* not Found`); return
        }

        const callbacks = this.listeners.get(eventType)!
        if (!async) {
            // Call synchronously
            callbacks.forEach(cb => cb(data))
        }
    }
}