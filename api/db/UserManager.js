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

    /**
     * Initialize the database
     * @async
     */
    async init() {
        this.client = new MongoClient('mongodb://localhost:27017');
        await this.client.connect();
        this.db = this.client.db('pm_userdata');
        this.users = this.db.collection('users');
        this.reports = this.db.collection('reports');
    }

    /**
     * Reset the database
     * @param {boolean} understands - skip the prompt if true
     * @async
     */
    async reset(understands = false) {
        if (!understands) {
            if (prompt("This deletes ALL USER DATA. Are you sure? (y/n) ") !== "y")
            return;
        }
        await this.users.deleteMany({});
        await this.reports.deleteMany({});
    }

    /**
     * Create an account
     * @param {string} username - new username of the user
     * @param {string} password - new password of the user
     * @returns {Promise<string|boolean>} - token if successful, false if not
     * @async
     */
    async createAccount(username, password) {
        const result = await this.users.findOne({ username: username });
        if (result) {
            return false;
        }

        const hash = await bcrypt.hash(password, 10);
        const id = generateId();
        const token = generateToken();
        await this.users.insertOne({
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
     * Login with a password
     * @param {string} username - username of the user
     * @param {string} password - password of the user
     * @returns {Promise<string|boolean>} - token if successful, false if not
     * @async
     */
    async loginWithPassword(username, password) {
        const result = await this.users.findOne({ username: username });
        if (!result) return false;
        if (await bcrypt.compare(password, result.password)) {
            this.users.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return result.privateCode;
        } else {
            return false;
        }
    }

    /**
     * Login with a token
     * @param {string} username - username of the user
     * @param {string} token - token of the user
     * @returns {Promise<boolean>} - true if successful, false if not
     * @async
     */ 
    async loginWithToken(username, token) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        // login invalid if more than the time
        if (result.lastLogin + UserManager.loginInvalidationTime < Date.now()) {
            return false;
        }

        // check that the tokens are equal
        if (result.privateCode === token) {
            this.users.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return true;
        } else {
            return false;
        }
    }

    /**
     * Check if a user exists by username
     * @param {string} username - username of the user 
     * @returns {Promise<boolean>} - true if the user exists, false if not
     * @async
     */
    async existsByUsername(username) {
        const result = await this.users.findOne({ username: username });
        if (result) return true;
        return false;
    }

    /**
     * Check if a user exists by ID
     * @param {string} id - id of the user
     * @returns {Promise<boolean>} - true if the user exists, false if not
     * @async
     */
    async existsByID(id) {
        const result = await this.users.findOne({ id: id });
        if (result) return true;
        return false;
    }

    /**
     * Get the ID of a user by username
     * @param {string} username - username of the user
     * @returns {Promise<string>} - id of the user
     * @async
     */
    async getIDByUsername(username) {
        const result = await this.users.findOne({ username: username });
        return result.id;
    }

    /**
     * Get the username of a user by ID
     * @param {string} id - id of the user
     * @returns {Promise<string>} - username of the user
     * @async
     */
    async getUsernameByID(id) {
        const result = await this.users.findOne({ id: id });
        return result.username;
    }

    /**
     * Change the username of a user
     * @param {string} id - id of the user
     * @param {string} newUsername - new username of the user
     * @async
     */
    async changeUsername(id, newUsername) {
        await this.users.updateOne({ id: id }, { $set: { username: newUsername } });
    }

    /**
     * Change the password of a user
     * @param {string} username - username of the user
     * @param {string} newPassword - new password of the user
     * @async
     */
    async changePassword(username, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.users.updateOne({ username: username }, { $set: { password: hash, lastLogin: 0 } }); // sets password and invalidates token
    }

    /**
     * Get the bio of a user
     * @param {string} username - username of the user
     * @returns {Promise<string>} - bio of the user
     * @async
     */
    async getBio(username) {
        const result = await this.users.findOne({ username: username });
        return result.bio;
    }

    /**
     * Set the bio of a user
     * @param {string} username - username of the user
     * @param {string} newBio - new bio of the user
     * @async
     */
    async setBio(username, newBio) {
        await this.users.updateOne({ username: username }, { $set: { bio: newBio } });
    }

    /**
     * Change the favorite project of a user
     * @param {string} username - username of the user
     * @param {number} type - type of the project (the description that will be shown)
     * @param {number} id - id of the project
     * @async
     */
    async changeFavoriteProject(username, type, id) {
        await this.users.updateOne({ username: username }, { $set: { favoriteProjectType: type, favoriteProjectID: id } });
    }
    
    /**
     * Get the amount of cubes a user has
     * @param {string} username - username of the user
     * @returns {Promise<number>} - amount of cubes the user has
     * @async
     */
    async getCubes(username) {
        const result = await this.users.findOne({ username: username });

        return result.cubes;
    }

    /**
     * Set the amount of cubes a user has
     * @param {string} username - username of the user
     * @param {number} amount - amount of cubes the user has
     * @async
     */
    async setCubes(username, amount) {
        await this.users.updateOne({ username: username }, { $set: { cubes: amount } });
    }

    /**
     * @param {string} username - username of the user
     * @returns {Promise<number>} - rank of the user
     * @async
     */
    async getRank(username) {
        const result = await this.users.findOne({ username: username });

        return result.rank;
    }

    /**
     * @param {string} username - username of the user
     * @param {number} rank - new rank of the user
     * @async
     */
    async setRank(username, rank) {
        await this.users.updateOne({ username: username }, { $set: { rank: rank } });
    }

    /**
     * 
     * @param {string} username - username of the user 
     * @returns {Promise<Array<string>>} - array of badges the user has
     * @async
     */
    async getBadges(username) {
        const result = await this.users.findOne({ username: username });

        return result.badges;
    }

    /**
     * 
     * @param {string} username - username of the user 
     * @param {string} badge - the badge to add
     * @async
     */
    async addBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $push: { badges: badge } });
    }

    /**
     * 
     * @param {string} username - username of the user 
     * @param {string} badge - the badge to remove 
     * @async
     */
    async removeBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $pull: { badges: badge } });
    }

    /**
     * @param {string} username 
     * @returns {Promise<boolean>} - true if the user is an admin, false if not
     * @async
     */
    async isAdmin(username) {
        const result = await this.users.findOne({ username: username });

        return result.admin;
    }

    /**
     * @param {string} username - username of the user 
     * @param {boolean} admin - true if setting to admin, false if not 
     * @async
     */
    async setAdmin(username, admin) {
        await this.users.updateOne({ username: username }, { $set: { admin: admin } });
    }

    /**
     * @param {string} username - username of the user
     * @returns {Promise<boolean>} - true if the user is a moderator, false if not
     * @async
     */
    async isModerator(username) {
        const result = await this.users.findOne({ username: username });

        return result.moderator;
    }

    /**
     * @param {string} username - username of the user
     * @param {boolean} moderator - true if setting to moderator, false if not
     * @async
     */
    async setModerator(username, moderator) {
        await this.users.updateOne({ username: username }, { $set: { moderator: moderator } });
    }

    /**
     * @param {string} username - username of the user
     * @returns {Promise<boolean>} - true if the user is banned, false if not
     * @async
     */
    async isBanned(username) {
        const result = await this.users.findOne({ username: username });

        return result.banned;
    }

    /**
     * @param {string} username - username of the user
     * @param {boolean} banned - true if banning, false if unbanning
     * @async
     */
    async setBanned(username, banned) {
        await this.users.updateOne({ username: username }, { $set: { banned: banned } });
    }

    /**
     * @param {string} username - username of the user
     * @async
     */
    async logout(username) {
        await this.users.updateOne({ username: username }, { $set: { lastLogin: 0 } }); // makes the token invalid
    }

    /**
     * 
     * @param {number} type - Type of report. 0 = user, 1 = project 
     * @param {string} reportee - ID of the person/project being reported 
     * @param {string} reason - Reason for the report 
     * @param {string} reporter - ID of the person reporting 
     * @async
     */
    async report(type, reportee, reason, reporter) {
        await this.reports.insertOne({
            type: type,
            reportee: reportee,
            reason: reason,
            reporter: reporter,
            id: generateId()
        })
    }

    /**
     * @param {number} type - The type of reports to get 
     * @returns {Promise<Array<object>>} - Array of reports of the specified type
     * @async
     */
    async getReportsByType(type) {
        const result = await this.reports.find({ type: type }).toArray();
        return result;
    }

    /**
     * @param {string} reportee - ID of the person/project being reported
     * @returns {Promise<Array<object>>} - Array of reports on the specified reportee
     * @async
     */
    async getReportsByReportee(reportee) {
        const result = await this.reports.find({ reportee: reportee }).toArray();
        return result;
    }

    /**
     * @param {string} reporter - ID of the person reporting
     * @returns {Promise<Array<object>>} - Array of reports by the specified reporter
     * @async 
     */
    async getReportsByReporter(reporter) {
        const result = await this.reports.find({ reporter: reporter }).toArray();
        return result;
    }

    /**
     * @param {string} id - ID of the report to delete
     * @async
     */
    async deleteReport(id) {
        await this.reports.deleteOne({ id: id });
    }
}

module.exports = UserManager;