type EventBase = { type: string }

type EventType = EventBase & { [key: string]: unknown };

export class EventDispatcher {

    private listeners: {
        [type: string]: Array<Function>
    }

    constructor() {

        this.listeners = {}
    }

    addEventListeners(type: string, callback: Function) {

        if (!this.listeners[type]) this.listeners[type] = []
        this.listeners[type].push(callback)
    }

    removeEventListeners(type: string, callback: Function) {

        const stack = this.listeners[type]
        if (stack && stack.length) {
            for (let i = 0; i < stack.length; i++) {
                if (stack[i] === callback) {
                    stack.splice(i, 1)
                    return
                }
            }
        }
    }

    dispatchEvent(event: EventType) {

        const stack = this.listeners[event.type]
        if (!stack) {
            console.warn(`No listeners for event type: ${event.type}`)
            return
        }

        if (stack && stack.length) {
            stack.forEach(callback => {
                callback.call(this, event)
            })
        }
    }

    handleEvent(event: EventType) {

        const stack = this.listeners[event.type]
        if (stack && stack.length) {
            stack.forEach(callback => {
                callback.call(this, event)
            })
        }
    }
}