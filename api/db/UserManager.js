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

    /**
     * @param {boolean} understands - skip the prompt if true
     */
    async reset(understands = false) {
        if (!understands) {
            if (prompt("This deletes ALL USER DATA. Are you sure? (y/n) ") !== "y")
            return;
        }
        await this.collection.deleteMany({});
    }

    /*/
    Account creation + login
    /*/

    /**
     * @param {string} username - new username of the user
     * @param {string} password - new password of the user
     * @returns {string|boolean} - token if successful, false if not
     * @async
     */
    async createAccount(username, password) {
        const result = await this.collection.findOne({ username: username });
        if (result) {
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

    /**
     * @param {string} username - username of the user
     * @param {string} password - password of the user
     * @returns {string|boolean} - token if successful, false if not
     * @async
     */
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

    /**
     * @param {string} username - username of the user
     * @param {string} token - token of the user
     * @returns {boolean} - true if successful, false if not
     * @async
     */ 
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

    /**
     * @param {string} username - username of the user 
     * @returns {boolean} - true if the user exists, false if not
     * @async
     */
    async existsByUsername(username) {
        const result = await this.collection.findOne({ username: username });
        if (result) return true;
        return false;
    }

    /**
     * @param {string} id - id of the user
     * @returns {boolean} - true if the user exists, false if not
     * @async
     */
    async existsByID(id) {
        const result = await this.collection.findOne({ id: id });
        if (result) return true;
        return false;
    }

    /**
     * @param {string} username - username of the user
     * @returns {string} - id of the user
     * @async
     */
    async getIDByUsername(username) {
        const result = await this.collection.findOne({ username: username });
        return result.id;
    }

    /**
     * @param {string} id - id of the user
     * @returns {string} - username of the user
     * @async
     */
    async getUsernameByID(id) {
        const result = await this.collection.findOne({ id: id });
        return result.username;
    }

    /**
     * @param {string} id - id of the user
     * @param {string} newUsername - new username of the user
     */
    async changeUsername(id, newUsername) {
        await this.collection.updateOne({ id: id }, { $set: { username: newUsername } });
    }

    /**
     * @param {string} username - username of the user
     * @param {string} newPassword - new password of the user
     */
    async changePassword(username, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.collection.updateOne({ username: username }, { $set: { password: hash } });
    }

    /**
     * @param {string} username - username of the user
     * @returns {string} - bio of the user
     * @async
     */
    async getBio(username) {
        const result = await this.collection.findOne({ username: username });
        return result.bio;
    }

    /**
     * @param {string} username - username of the user
     * @param {string} newBio - new bio of the user
     */
    async setBio(username, newBio) {
        await this.collection.updateOne({ username: username }, { $set: { bio: newBio } });
    }

    /**
     * @param {string} username - username of the user
     * @param {number} type - type of the project (the description that will be shown)
     * @param {number} id - id of the project
     */
    async changeFavoriteProject(username, type, id) {
        await this.collection.updateOne({ username: username }, { $set: { favoriteProjectType: type, favoriteProjectID: id } });
    }
    
    /**
     * @param {string} username - username of the user
     * @returns {number} - amount of cubes the user has
     * @async
     */
    async getCubes(username) {
        const result = await this.collection.findOne({ username: username });

        return result.cubes;
    }

    /**
     * @param {string} username - username of the user
     * @param {number} amount - amount of cubes the user has
     */
    async setCubes(username, amount) {
        await this.collection.updateOne({ username: username }, { $set: { cubes: amount } });
    }

    /**
     * @param {string} username - username of the user
     * @returns {number} - rank of the user
     * @async
     */
    async getRank(username) {
        const result = await this.collection.findOne({ username: username });

        return result.rank;
    }

    /**
     * @param {string} username - username of the user
     * @param {number} rank - new rank of the user
     */
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