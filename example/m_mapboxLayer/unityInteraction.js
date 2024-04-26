let pickedObjectName

let pickedObject = {
    /**
     * @type {string}
     */
    _name: '',

    /**
     * @param {string} nameStr
     */
    set name(nameStr) {

        this._name = nameStr
        alert(`Pick Up: ${this._name}`)
    },

    get name() {
        return this._name
    }
}

function consoleLogMessageFromUnity(message) {
    console.log("Received message from Unity:", message);
}

function pickUp(name) {

    pickedObject.name = name
}