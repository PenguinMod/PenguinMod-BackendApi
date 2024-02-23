const { randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
var prompt = require('prompt-sync')();


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

    async reset() {
        if (prompt("This deletes ALL USER DATA. Are you sure? (y/n) ") !== "y") return;
        await this.collection.deleteMany({});
    }

    /*/
    Account creation + login
    /*/

    async createAccount(username, password) {
        const result = await this.collection.findOne({ username: username });
        if (result) {
            console.log(result);
            return false;
        }

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

    async loginWithPassword(username, password) {
        const result = await this.collection.findOne({ username: username });
        if (!result) return false;
        if (await bcrypt.compare(password, result.password)) {
            this.collection.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return result.privateCode;
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

    /*/
    Account management
    /*/

    async getIDByUsername(username) {
        const result = await this.collection.findOne({ username: username });
        return result.id;
    }

    async getUsernameByID(id) {
        const result = await this.collection.findOne({ id: id });
        return result.username;
    }

    async changeUsername(id, newUsername) {
        await this.collection.updateOne({ id: id }, { $set: { username: newUsername } });
    }

    async changePassword(username, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.collection.updateOne({ username: username }, { $set: { password: hash } });
    }

    async setBio(username, newBio) {
        await this.collection.updateOne({ username: username }, { $set: { bio: newBio } });
    }

    async changeFavoriteProject(username, type, id) {
        await this.collection.updateOne({ username: username }, { $set: { favoriteProjectType: type, favoriteProjectID: id } });
    }
    
    async getCubes(username) {
        const result = await this.collection.findOne({ username: username });

        return result.cubes;
    }

    async setCubes(username, amount) {
        await this.collection.updateOne({ username: username }, { $set: { cubes: amount } });
    }

    async getRank(username) {
        const result = await this.collection.findOne({ username: username });

        return result.rank;
    }

    async setRank(username, rank) {
        await this.collection.updateOne({ username: username }, { $set: { rank: rank } });
    }

    async getBadges(username) {
        const result = await this.collection.findOne({ username: username });

        return result.badges;
    }

    async addBadge(username, badge) {
        await this.collection.updateOne({ username: username }, { $push: { badges: badge } });
    }

    async removeBadge(username, badge) {
        await this.collection.updateOne({ username: username }, { $pull: { badges: badge } });
    }

    async isAdmin(username) {
        const result = await this.collection.findOne({ username: username });

        return result.admin;
    }

    async setAdmin(username, admin) {
        await this.collection.updateOne({ username: username }, { $set: { admin: admin } });
    }

    async isModerator(username) {
        const result = await this.collection.findOne({ username: username });

        return result.moderator;
    }

    async setModerator(username, moderator) {
        await this.collection.updateOne({ username: username }, { $set: { moderator: moderator } });
    }

    async isBanned(username) {
        const result = await this.collection.findOne({ username: username });

        return result.banned;
    }

    async setBanned(username, banned) {
        await this.collection.updateOne({ username: username }, { $set: { banned: banned } });
    }
}

module.exports = UserManager;