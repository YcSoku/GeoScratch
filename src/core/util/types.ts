/////// Sharing-Types //////////////////////////////////
export type AnyCallBack = (...args: any[]) => any


// Event
export type EventCallBack = (...args: any[]) => void
export type EventDescription = {
    id: string
    meta?: Record<string, unknown>
}