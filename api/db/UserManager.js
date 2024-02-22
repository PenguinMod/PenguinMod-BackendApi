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

class UserManager {
    async init() {
        this.client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true });
        await this.client.connect();
    }
}

module.exports = UserManager;