/**
 * Throttling of low-frequency events (e.g. form submissions, network requests)
 * 
 * Invokes the wrapped function in a non-blocking way when trigger() is called.
 */
export default class MacroThrottledInvoker {
    _channel: MessageChannel
    _triggered: boolean
    _callback: any

    constructor(callback: any) {
        this._callback = callback
        this._triggered = false
        this._channel = new MessageChannel()
        this._channel.port2.onmessage = () => {
            this._triggered = false // invoke callback when the message is received
            this._callback()
        }
    }

    trigger() {
        if (this._triggered === false) {
            this._triggered = true
            this._channel.port1.postMessage(true)
        }
    }

    remove() {
        // @ts-ignore release memory
        this._channel = undefined;
        this._callback = () => { };
    }
}