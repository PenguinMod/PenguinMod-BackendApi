const Database = require("easy-json-database")
const fetch = require("node-fetch")

const { encrypt, decrypt } = require("../utilities/encrypt.js")
const { ParseJSON } = require("../utilities/safejsonparse.js")

const ScratchAuthURLs = {
    verifyToken: `https://api.allorigins.win/raw?url=https://auth.itinerary.eu.org/api/auth/verifyToken?privateCode=`,
}

class UserManager {
    static _states = {}
    
    static async serialize() {
        const db = new Database(`./users.json`)
        db.set("data", encrypt(JSON.stringify(UserManager._states)))
    }
    static deserialize() {
        const db = new Database(`./users.json`)
        if (!db.get("data")) return {}
        return ParseJSON(decrypt(db.get("data")))
    }
    
    static load() {
        UserManager._states = UserManager.deserialize()
    }

    static isBanned(username) {
        const db = new Database(`./banned.json`)
        if (db.get(String(username))) return true
        return false
    }
    
    static isCorrectCode(username, privateCode) {
        if (!privateCode) return false
        if (!UserManager._states[username]) return false
        return UserManager._states[username] == privateCode
    }
    static usernameFromCode(privateCode) {
        const codes = Object.getOwnPropertyNames(UserManager._states)
        let returning = null
        for (let i = 0; i < codes.length; i++) {
            if (UserManager._states[codes[i]] == privateCode) {
                returning = codes[i]
            }
        }
        return returning
    }
    static setCode(username, privateCode) {
        UserManager._states[username] = privateCode
        UserManager.serialize()
    }
    static logoutUser(username) {
        if (UserManager._states[username] == null) return
        delete UserManager._states[username]
        UserManager.serialize()
    }
    static verifyCode(privateCode) {
        return new Promise((resolve, reject) => {
            fetch(ScratchAuthURLs.verifyToken + privateCode).then(res => {
                res.json().then(resolve).catch(reject)
            }).catch(reject)
        })
    }
}

module.exports = UserManager