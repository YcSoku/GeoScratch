import Event from "./event"
import { EventCallBack, EventDescription } from "../util/types"

export default class EventBus {

    events: Map<string, Event>
    private static instance: EventBus | null = null
    constructor() {

        this.events = new Map()
    }

    static getInstance(): EventBus {

        if (!EventBus.instance) EventBus.instance = new EventBus()
        return EventBus.instance
    }

    register(eventDescription: EventDescription) {

        if (this.events.has(eventDescription.id)) {
            console.warn(`Event *${eventDescription.id}* has already registered`); return
        }
        this.events.set(eventDescription.id, new Event(eventDescription))
    }

    on(eventName: string, callback: EventCallBack): void {

        if (!this.check(eventName)) return
        this.events.get(eventName)!.addListener(callback)
    }

    off(eventName: string, callback: EventCallBack): void {

        if (!this.check(eventName)) return
        this.events.get(eventName)!.removeListener(callback)
    }

    emit(eventName: string, data: unknown, async: boolean = false) {

        if (!this.check(eventName)) return
        this.events.get(eventName)!.emit(data, async)
    }

    private check(eventName: string) {

        if (this.events.has(eventName) === false) {
            console.warn(`Event *${eventName}* is not registered`); return false
        }
        return true
    }
}