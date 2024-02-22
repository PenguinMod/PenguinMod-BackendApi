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
    async init() {
        this.client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true });
        await this.client.connect();
        this.db = this.client.db('pm_userdata');
        this.collection = this.db.collection('users');
    }

    async createAccount(username, password) {
        const hash = await bcrypt.hash(password, 10);
        const id = generateId();
        const token = generateToken();
        const result = await this.collection.insertOne({
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
            favoriteProjectType: 0,
            favoriteProjectID: "idfk",
            cubes: 0,
            firstLogin: Date.now(),
            lastLogin: Date.now()
        });
        return [id, token];
    }

    async getIDByUsername(username) {
        const result = await this.collection.findOne({ username: username });
        return result.id;
    }

    async getUsernameByID(id) {
        const result = await this.collection.findOne({ id: id });
        return result.username;
    }
}

module.exports = UserManager;