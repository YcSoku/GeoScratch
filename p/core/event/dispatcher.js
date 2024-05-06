export class EventDispatcher {

    constructor() {

        /**
         * @type {{[type: string]: [Function]}}
         */
        this.listeners = {}
        /**
         * @type {[any]}
         */
        this.events = []
    }

    /**
     * @param {string} type 
     * @param {Function} callback 
     */
    addEventListeners(type, callback) {

        if (!this.listeners[type]) this.listeners[type] = []

        this.listeners[type].push(callback)
    }

    /**
     * @param {string} type 
     * @param {Function} callback 
     */
    removeEventListeners(type, callback) {

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

    /**
     * @param {any} event 
     */
    dispatchEvent(event) {

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
}