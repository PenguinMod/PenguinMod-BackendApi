const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');

function generateId() {
    const rn = [
        Math.random() * 100000,
        Math.random() * 100000,
        Math.random() * 100000,
        Math.random() * 100000
    ];
    const raw = rn.join('.');
    return Buffer.from(raw).toString("base64");
};

function generateToken() {
    return randomBytes(32).toString('base64');
}

class UserManager {
    static loginInvalidationTime = 
    1000 *  // second
    60 * // minute
    60 * // hour
    24 * // day
    3; // 3 days

    async init() {
        this.client = new MongoClient('mongodb://localhost:27017');
        await this.client.connect();
        this.db = this.client.db('pm_userdata');
        this.collection = this.db.collection('users');
    }

    async createAccount(username, password) {
        const hash = await bcrypt.hash(password, 10);
        const id = generateId();
        const token = generateToken();
        await this.collection.insertOne({
            id: id,
            username: username,
            password: hash,
            privateCode: token,
            admin: false,
            moderator: false,
            banned: false,
            rank: 0,
            badges: [],
            bio: "",
            favoriteProjectType: -1,
            favoriteProjectID: -1,
            cubes: 0,
            firstLogin: Date.now(),
            lastLogin: Date.now()
        });
        return token;
    }

    async getIDByUsername(username) {
        const result = await this.collection.findOne({ username: username });
        return result.id;
    }

    async getUsernameByID(id) {
        const result = await this.collection.findOne({ id: id });
        return result.username;
    }

    async loginWithPassword(username, password) {
        const result = await this.collection.findOne({ username: username });
        if (!result) return false;
        if (await bcrypt.compare(password, result.password)) {
            this.collection.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return true;
        } else {
            return false;
        }
    }

    async loginWithToken(username, token) {
        const result = await this.collection.findOne({ username: username });

        if (!result) return false;

        // login invalid if more than the time
        if (result.lastLogin + UserManager.loginInvalidationTime < Date.now()) {
            return false;
        }

        // check that the tokens are equal
        if (result.privateCode === token) {
            this.collection.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return true;
        } else {
            return false;
        }
    }

    async changeUsername(id, newUsername) {
        await this.collection.updateOne({ id: id }, { $set: { username: newUsername } });
    }
}

module.exports = UserManager;