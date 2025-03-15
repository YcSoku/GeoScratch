/**
 * Throttling scheduler for high-frequency events (e.g., input, rollover)
 * that require the lowest latency response.
 * 
 * Invokes the wrapped function in a non-blocking way when trigger() is called.
 */
export default class MicroThrottledInvoker {
	private _pending: boolean
	private _callback: Function

	constructor(callback?: Function) {
		this._callback = callback ? callback : () => { }
		this._pending = false
	}

	setCallback(fn: Function) {
		this._callback = fn
	}

	trigger() {
		if (!this._pending) {
			this._pending = true
			Promise.resolve().then(() => {
				this._callback()
				this._pending = false
			})
		}
	}

	remove() {
		this._pending = false
		this._callback = () => { }
	}
}