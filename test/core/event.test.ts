import EventBus from "../../src/core/event/eventBus"

export default () => {

    const eventBus = EventBus.getInstance()

    /////// register //////////////////////////////////
    eventBus.register({
        "id": 'init',
        "meta": {
            "description": "init event"
        }
    })
    eventBus.register({
        "id": 'init',
        "meta": {
            "description": "init event"
        }
    })

    /////// on //////////////////////////////////
    const slistner = (data: unknown) => {
        console.log('same listen init event', data)
    }

    eventBus.on('init', () => {
        console.log('listen init event 1')
    })
    eventBus.on('init', () => {
        console.log('listen init event 2')
    })
    eventBus.on('init', slistner)
    eventBus.on('init', slistner)


    /////// emit //////////////////////////////////
    eventBus.emit('init', {
        emitter: "Mike",
        data: " **hello everybody** "
    }, true)
    eventBus.emit('init', {
        emitter: "Jack",
        data: " **fake everybody** "
    })
    eventBus.emit('init', {
        emitter: "John",
        data: " **Hi everybody** "
    })




}