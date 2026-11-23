class Authentication {
    constructor(db_controller) {
        /**
         * @type import("./DBController")
         */
        this.db = db_controller;
    }

    /**
     * @typedef {Object} LoginResult
     * @property {string} username The user's username. Blank if unsuccessful
     * @property {string} token The user's token.
     * @property {string} id The user's id. Blank if unsuccessful
     * @property {boolean} success If the login was successful
     * @property {boolean} exists If the account even exists
     * @property {boolean} isDonator
     * @property {boolean} isMod true if has mod OR admin
     * @property {boolean} isAdmin
     * @property {boolean} emailVerified
     * @property {string} email
     * @property {string[]} badges
     */

    /**
     * Login with a token
     * @param {string?} username username of the user. Optional
     * @param {string} token token of the user
     * @param {boolean} allowBanned allow banned users to login
     * @returns {Promise<LoginResult>} Result of the login attempt
     * @async
     */
    async loginWithToken(token, allowBanned, get_full_meta = false) {
        token = String(token);

        const data = {
            success: false,
            username: "",
            token,
            id: "",
            rank: 0,
            exists: false,
            isDonator: false,
            isMod: false,
            isAdmin: false,
            emailVerified: false,
            email: "",
            badges: [],
        };

        if (token === "undefined") {
            return data;
        }

        const result = await this.db.users.findOne({ token });

        if (!result) {
            return data;
        }

        data.username = result.username;
        data.id = result.id;
        data.exists = true;
        data.isDonator = result.badges.includes("donator");
        data.isMod = result.moderator || result.admin;
        data.isAdmin = result.admin;
        data.emailVerified = result.emailVerified;
        data.email = result.email;
        data.rank = result.rank;
        data.badges = result.badges;

        if (get_full_meta) {
            data.fullMeta = result;
        }

        if (
            ((result.permBanned || result.unbanTime > Date.now()) &&
                !allowBanned) ||
            result.lastLogin +
                (Number(process.env.LoginInvalidationTime) || 259200000) <
                Date.now()
        ) {
            return data;
        }

        data.success = true;

        await this.db.users.updateOne(
            { token },
            { $set: { lastLogin: Date.now() } },
        );
        return data;
    }
}

module.exports = Authentication;
