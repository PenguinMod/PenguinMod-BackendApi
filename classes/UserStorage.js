class UserStorage {
    constructor(bytes, keys) {
        this.containers = {}
        this._maxKeys = keys
        this._maxBytes = bytes
    }
    
    createContainer(name) {
        this.containers[name] = {}
    }
    getContainer(name) {
        return this.containers[name]
    }
    
    save(containerName, key, value, createIfNone) {
        if (typeof value != "string") throw new Error("Only strings can be saved")
        if (!this.containers[containerName]) {
            if (createIfNone) {
                this.containers[containerName] = {}
            } else {
                throw new Error("Container does not exist")
            }
        }
        if ((String(value).length) > this._maxBytes) throw new Error("Byte limit exceeded; " + String((String(value).length) - this._maxBytes) + " bytes over limit")
        if (!Object.getOwnPropertyNames(this.containers[containerName]).includes(key)) {
            if (Object.getOwnPropertyNames(this.containers[containerName]).length >= this._maxKeys) throw new Error("Only " + this._maxKeys + " can be created per container")
        }
        this.containers[containerName][key] = value
    }
    get(containerName, key, createIfNone) {
        if (!this.containers[containerName]) {
            if (createIfNone) {
                this.containers[containerName] = {}
            } else {
                throw new Error("Container does not exist")
            }
        }
        return this.containers[containerName][key]
    }
}

module.exports = UserStorage