const { MongoClient } = require('mongodb');

class UserManager {
    async init() {
        this.client = new MongoClient('mongodb://localhost:27017', { useUnifiedTopology: true });
        await this.client.connect();
    }
}

module.exports = UserManager;