require('dotenv').config();
const { randomInt, randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const ULID = require('ulid');
const Minio = require('minio');
const protobuf = require('protobufjs');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
var prompt = require('prompt-sync')();
const Mailjet = require('node-mailjet');
const { count } = require('node:console');

const basePFP = fs.readFileSync(path.join(__dirname, "./penguin.png"));

class UserManager {
    /**
     * Initialize the database
     * @param {number} maxviews maximum amount of views before the view counter resets
     * @param {number} viewresetrate time in milliseconds before the view counter resets
     * @async
     */
    async init(maxviews, viewresetrate) {
        this.client = new MongoClient(process.env.MongoUri || 'mongodb://localhost:27017');
        await this.client.connect();
        this.db = this.client.db('pm_apidata');
        this.users = this.db.collection('users');
        await this.users.createIndex({ username: 1 }, { unique: true });
        await this.users.createIndex({ id: 1 }, { unique: true });
        this.accountCustomization = this.db.collection('accountCustomization');
        this.loggedIPs = this.db.collection('loggedIPs');
        this.passwordResetStates = this.db.collection('passwordResetStates');
        await this.passwordResetStates.createIndex({ 'expireAt': 1 }, { expireAfterSeconds: 60 * 60 * 2 }); // give 2 hours
        this.sentEmails = this.db.collection('sentEmails');
        await this.sentEmails.createIndex({ 'expireAt': 1 }, { expireAfterSeconds: 60 * 60 * 24 });
        this.followers = this.db.collection("followers");
        this.oauthIDs = this.db.collection('oauthIDs');
        this.reports = this.db.collection('reports');
        this.runtimeConfig = this.db.collection('runtimeConfig');
        if (!await this.runtimeConfig.findOne({ id: "viewingEnabled" })) {
            this.runtimeConfig.insertOne({ id: "viewingEnabled", value: Boolean(process.env.ViewingEnabled) });
            this.runtimeConfig.insertOne({ id: "uploadingEnabled", value: Boolean(process.env.UploadingEnabled) });
        }
        this.projects = this.db.collection('projects');
        //this.projects.dropIndexes();
        await this.projects.createIndex({ title: "text", instructions: "text", notes: "text"});
        // index for front page, sort by newest
        await this.projects.createIndex({ lastUpdate: -1 });
        this.projectStats = this.db.collection('projectStats');
        this.messages = this.db.collection('messages');
        this.oauthStates = this.db.collection('oauthStates');
        await this.oauthStates.createIndex({ 'expireAt': 1 }, { expireAfterSeconds: 60 * 5 }); // give 5 minutes
        this.userFeed = this.db.collection('userFeed');
        await this.userFeed.createIndex({ 'expireAt': 1 }, { expireAfterSeconds: Number(process.env.FeedExpirationTime) });
        this.illegalList = this.db.collection('illegalList');
        this.lastPolicyUpdates = this.db.collection('lastPolicyUpdates');
        if (!await this.lastPolicyUpdates.findOne({ id: "privacyPolicy" })) {
            this.lastPolicyUpdates.insertOne({ id: "privacyPolicy", lastUpdate: Date.now() });
            this.lastPolicyUpdates.insertOne({ id: "TOS", lastUpdate: Date.now() });
            this.lastPolicyUpdates.insertOne({ id: "guidelines", lastUpdate: Date.now() });
        }
        if (!await this.illegalList.findOne({ id: "illegalWords" })) {
            this.illegalList.insertMany([
                { id: "illegalWords", items: [] },
                { id: "illegalWebsites", items: [] },
                { id: "spacedOutWordsOnly", items: [] },
                { id: "potentiallyUnsafeWords", items: [] },
                { id: "potentiallyUnsafeWordsSpacedOut", items: [] },
                { id: "legalExtensions", items: []}
            ]);
        }
        this.blocking = this.db.collection("blocking");
        this.prevReset = Date.now();
        this.views = [];

        this.maxviews = maxviews ? maxviews : 10000;
        this.viewresetrate = viewresetrate ? viewresetrate : 1000 * 60 * 60;

        // Setup minio

        this.minioClient = new Minio.Client({
            endPoint: process.env.MinioEndPoint,
            port: Number(process.env.MinioPort),
            useSSL: false,
            accessKey: process.env.MinioClientID,
            secretKey: process.env.MinioClientSecret
        });
        // project bucket
        await this._makeBucket("projects");
        // project thumbnail bucket
        await this._makeBucket("project-thumbnails");
        // project asset bucket
        await this._makeBucket("project-assets");
        // pfp bucket
        await this._makeBucket("profile-pictures");
    }

    _makeBucket(bucketName) {
        return new Promise((resolve, reject) => {
            this.minioClient.bucketExists(bucketName, (err, exists) => {
                if (err) {
                    console.log("Error checking if bucket exists:", err);
                    reject("error making bucket: " + err);
                    return;
                }
                if (!exists) {
                    this.minioClient.makeBucket(bucketName, (err) => {
                        if (err) {
                            console.log("Error making bucket:", err);
                            reject("error making bucket: " + err);
                        }
                    });
                }
                resolve();
            });
        });
    }

    /**
     * Reset a minio bucket
     * @param {string} bucketName Name of the bucket
     * @async
     */
    async resetBucket(bucketName) {
        this.deleteMultipleObjects(bucketName, "");
    }

    /**
     * Reset the database
     * @param {boolean} understands skip the prompt if true
     * @async
     */
    async reset(understands = false) {
        if (!understands) {
            let unde = prompt("This deletes ALL DATA. Are you sure? (Y/n) ")
            if (typeof unde !== "string") {
                return;
            }
        }

        await this.users.deleteMany({});
        await this.loggedIPs.deleteMany({});
        await this.passwordResetStates.deleteMany({});
        await this.sentEmails.deleteMany({});
        await this.followers.deleteMany({});
        await this.oauthIDs.deleteMany({});
        await this.reports.deleteMany({});
        await this.runtimeConfig.deleteMany({});
        await this.projects.deleteMany({});
        await this.projectStats.deleteMany({});
        await this.messages.deleteMany({});
        await this.oauthStates.deleteMany({});
        await this.userFeed.deleteMany({});
        await this.illegalList.deleteMany({});
        // dont reset policy stuff, we need that :normal:

        // reset minio buckets
        await this.resetBucket("projects");
        await this.resetBucket("project-thumbnails");
        await this.resetBucket("project-assets");
        await this.resetBucket("profile-pictures");
    }

    async setLifecyclePolicy(bucketName, policy) {
        await this.minioClient.setBucketLifecycle(bucketName, policy);
    }

    /**
     * Create an account
     * @param {string} username new username of the user
     * @param {string?} password new password of the user
     * @param {string?} email email of the user, if provided
     * @param {string?} birthday birth date of the user formatted as an ISO string "1990-01-01T00:00:00.000Z", if provided
     * @param {string?} country country code if the user as defined by ISO 3166-1 Alpha-2, if provided
     * @param {boolean} is_studio whether or not the account being created is a studio or not
     * @returns {Promise<[string, string]|boolean>} token & id if successful, false if not
     * @async
     */
    async createAccount(username, real_username, password, email, birthday, country, is_studio, utils, res) {
        const result = await this.users.findOne({ username: username });
        if (result) {
            return false;
        }

        const illegalWordingError = async (text, type) => {
            const trigger = await this.checkForIllegalWording(text);
            if (trigger) {
                utils.error(res, 400, "IllegalWordsUsed")
    
                const illegalWordIndex = await this.getIndexOfIllegalWording(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username
                )
                
                return true;
            }
            return false;
        }

        const slightlyIllegalWordingError = async (text, type) => {
            let trigger = await this.checkForSlightlyIllegalWording(text);
            if (trigger) {
                const illegalWordIndex = await this.getIndexOfSlightlyIllegalWording(text);
    
                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(illegalWordIndex[0], illegalWordIndex[1]);
    
                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username,
                    0xffbb00,
                )
                return true;
            }
            return false;
        }

        if (await illegalWordingError(username, "username")) {
            return false;
        }

        await slightlyIllegalWordingError(username, "username");

        const hash = password ? await bcrypt.hash(password, 10) : "";
        const id = ULID.ulid();
        const token = randomBytes(32).toString('hex');
        const current_time = Date.now();
        await this.users.insertOne({
            id,
            username,
            real_username,
            password: hash,
            token: token,
            admin: false,
            moderator: false,
            permBanned: false,
            unbanTime: 0,
            banReason: "",
            rank: 0,
            badges: [],
            following: 0,
            followers: 0,
            bio: "",
            featuredProjectTitle: -1,
            featuredProject: -1,
            cubes: 0,
            firstLogin: current_time,
            lastLogin: current_time,
            lastUpload: 0,
            email,
            emailVerified: false,
            birthdayEntered: !!birthday,
            countryEntered: !!country,
            birthday,
            country,
            lastPrivacyPolicyRead: current_time,
            lastTOSRead: current_time,
            lastGuidelinesRead: current_time,
            privateProfile: false,
            allowFollowingView: false,
            is_studio,
        });

        await this.minioClient.putObject("profile-pictures", id, basePFP);

        return [token, id];
    }

    /**
     * Delete an account
     * @param {string} username username of the user
     * @returns {Promise<bool>} bool on if it was successful
     * @async
     */
    async deleteAccount(username) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        const deletionSuccess = (await this.users.deleteOne({
            username: username
        })).deletedCount > 0;

        if (!deletionSuccess) return false;

        await this.minioClient.removeObject("profile-pictures", result.id);

        // search for all projects by the user and delete them
        const user_id = result.id;

        const projects = await this.projects.find({ author: user_id }).toArray();

        for (const project of projects) {
            await this.deleteProject(project.id);
        }

        // delete all references to the user in the followers collection
        await this.followers.deleteMany({ target: user_id });
        const target_deletes = await this.followers.find({ follower: user_id }).toArray();

        for (const target of target_deletes) {
            await this.followers.deleteOne({ _id: target._id });
            // decrement the follower count of the target
            await this.users.updateOne({ id: target.target }, { $inc: { followers: -1 } });
        }

        // remove all reports by the user
        await this.reports.deleteMany({ reporter: user_id });
        await this.reports.deleteMany({ reportee: user_id });

        // remove all oauth methods
        await this.oauthIDs.deleteMany({ id: user_id });
        
        // remove logged IPs
        await this.loggedIPs.deleteMany({ id: user_id });

        return true;
    }

    /**
     * BE CAREFUL WITH THIS. DO NOT SEND IT IN ITS ENTIRETY. gets the entire user metadata.
     * @param {string} username username of the user 
     * @returns {Promise<object>}
     */
    async getUserData(username) {
        return await this.users.findOne({username: username});
    }

    /**
     * Login with a password
     * @param {string} username username of the user
     * @param {string} password password of the user
     * @returns {Promise<string|boolean>} token if successful, false if not
     * @async
     */
    async loginWithPassword(username, password, allowBanned) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        if ((result.permBanned || result.unbanTime > Date.now()) && !allowBanned) {
            return false;
        }

        if (await bcrypt.compare(password, result.password)) {
            return await this.newTokenGen(username);
        } else {
            return false;
        }
    }

    /**
     * Login with a token
     * @param {string} username username of the user
     * @param {string} token token of the user
     * @param {boolean} allowBanned allow banned users to login
     * @returns {Promise<boolean>} true if successful, false if not
     * @async
     */
    async loginWithToken(username, token, allowBanned) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        if ((result.permBanned || result.unbanTime > Date.now()) && !allowBanned) {
            return false;
        }

        // login invalid if more than the time
        if (result.lastLogin + (Number(process.env.LoginInvalidationTime) || 259200000) < Date.now()) {
            return false;
        }

        // check that the tokens are equal
        if (result.token === token) {
            this.users.updateOne({ username: username }, { $set: { lastLogin: Date.now() } });
            return true;
        } else {
            return false;
        }
    }

    async getRealUsername(username) {
        return (await this.users.findOne({username: username})).real_username;
    }

    /**
     * Check if a user exists by username
     * @param {string} username username of the user 
     * @returns {Promise<boolean>} true if the user exists, false if not
     * @async
     */
    async existsByUsername(username, showBanned=false) {
        let query = { username: username };
        if (!showBanned) {
            query = { $and: [ query, { permBanned: false, unbanTime: { $lt: Date.now() } } ] };
        }
        const result = await this.users.findOne(query);
        if (result) return true;
        return false;
    }

    /**
     * Check if a user exists by ID
     * @param {string} id id of the user
     * @returns {Promise<boolean>} true if the user exists, false if not
     * @async
     */
    async existsByID(id) {
        const result = await this.users.findOne({ id: id });
        if (result) return true;
        return false;
    }

    /**
     * Get the ID of a user by username
     * @param {string} username username of the user
     * @returns {Promise<string>} id of the user
     * @async
     */
    async getIDByUsername(username) {
        const result = await this.users.findOne({ username: username });
        return result.id;
    }

    /**
     * Get the username of a user by ID
     * @param {string} id id of the user
     * @returns {Promise<string>} username of the user
     * @async
     */
    async getUsernameByID(id) {
        const result = await this.users.findOne({ id: id });

        if (!result) return false; // prevent crashes

        return result.username;
    }

    /**
     * Change the username of a user
     * @param {string} id id of the user
     * @param {string} newUsername new username of the user
     * @async
     */
    async changeUsernameByID(id, newUsername, real_username) {
        await this.users.updateOne({ id: id }, { $set: { username: newUsername, real_username } });
    }

    async changeUsername(username, newUsername, real_username) {
        await this.users.updateOne({ username: username }, { $set: { username: newUsername, real_username } });
    }

    /**
     * Change the password of a user
     * @param {string} username username of the user
     * @param {string} newPassword new password of the user
     * @async
     */
    async changePassword(username, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.users.updateOne({ username: username }, { $set: { password: hash, lastLogin: 0 } }); // sets password and invalidates token
    }

    /**
     * Check if a user can login using a password
     * @param {string} username The user's username
     * @returns {Promise<boolean>} Whether the user can login with a password
     */
    async canPasswordLogin(username) {
        const result = await this.users.findOne({ username: username });

        return result.password ? true : false;
    }

    /**
     * Get a user's oauth login methods
     * @param {string} username Username of the user
     * @returns {Promise<Array<string>>} Array of the user's oauth methods
     */
    async getOAuthMethods(username) {
        const id = await this.getIDByUsername(username);

        const result = (await this.oauthIDs.find({ id: id })
        .toArray())
        .map(x => x.method);

        return result;
    }

    async getOAuthCode(username, method) {
        const id = await this.getIDByUsername(username);

        const result = await this.oauthIDs.findOne({ id: id, method: method });

        return result.code;
    }

    /**
     * Add an oauth login method to a user
     * @param {string} username Username of the user
     * @param {string} method Method to add
     */
    async addOAuthMethod(username, method, code) {
        const id = await this.getIDByUsername(username);

        await this.oauthIDs.insertOne({ id: id, method: method, code: code })
    }

    /**
     * Remove an oauth login method from a user
     * @param {string} username Username of the user 
     * @param {string} method Method to remove
     */
    async removeOAuthMethod(username, method) {
        const id = await this.getIDByUsername(username);

        await this.oauthIDs.deleteOne({ id: id, method: method });
    }

    /**
     * Get the ID of a user by their oauth ID
     * @param {string} method The oauth method the id is from
     * @param {string} id The id from the oauth service
     * @returns {Promise<string>} The id of the user
     */
    async getUserIDByOAuthID(method, id) {
        const result = await this.oauthIDs.findOne({ method: method, code: id });

        if (!result) return false;

        return result.id;
    }

    /**
     * Get the bio of a user
     * @param {string} username username of the user
     * @returns {Promise<string>} bio of the user
     * @async
     */
    async getBio(username) {
        const result = await this.users.findOne({ username: username });
        return result.bio;
    }

    /**
     * Set the bio of a user
     * @param {string} username username of the user
     * @param {string} newBio new bio of the user
     * @async
     */
    async setBio(username, newBio) {
        await this.users.updateOne({ username: username }, { $set: { bio: newBio } });
    }

    /**
     * Change the favorite project of a user
     * @param {string} username username of the user
     * @param {number} type type of the project (the description that will be shown)
     * @param {number} id id of the project
     * @async
     */
    async changeFavoriteProject(username, type, id) {
        await this.users.updateOne({ username: username }, { $set: { favoriteProjectType: type, favoriteProjectID: id } });
    }

    /**
     * Get the user's first login
     * @param {string} username Username of the user
     * @returns {Promise<number>} When the user first logged in Unix time
     */
    async getFirstLogin(username) {
        const result = await this.users.findOne({ username: username });

        return result.firstLogin;
    }

    /**
     * Get the user's last login
     * @param {string} username Username of the user
     * @returns {Promise<number>} Last time the user logged in Unix time
     * @async
     */
    async getLastLogin(username) {
        const result = await this.users.findOne({ username: username });

        return result.lastLogin;
    }
    
    /**
     * Get the amount of cubes a user has
     * @param {string} username username of the user
     * @returns {Promise<number>} amount of cubes the user has
     * @async
     */
    async getCubes(username) {
        const result = await this.users.findOne({ username: username });

        return result.cubes;
    }

    /**
     * Set the amount of cubes a user has
     * @param {string} username username of the user
     * @param {number} amount amount of cubes the user has
     * @async
     */
    async setCubes(username, amount) {
        await this.users.updateOne({ username: username }, { $set: { cubes: amount } });
    }

    /**
     * Get the rank of a user
     * @param {string} username username of the user
     * @returns {Promise<number>} rank of the user
     * @async
     */
    async getRank(username) {
        const result = await this.users.findOne({ username: username });

        return result.rank;
    }

    /**
     * Set the rank of a user
     * @param {string} username username of the user
     * @param {number} rank new rank of the user
     * @async
     */
    async setRank(username, rank) {
        await this.users.updateOne({ username: username }, { $set: { rank: rank } });
    }

    /**
     * Get the last upload time of a user
     * @param {string} username username of the user
     * @returns {Promise<number>} time of the last upload
     * @async
     */
    async getLastUpload(username) {
        const result = await this.users.findOne({ username: username });

        return result.lastUpload;
    }

    /**
     * Set the last upload time of a user
     * @param {string} username username of the user
     * @param {number} lastUpload time of the last upload
     * @async
     */
    async setLastUpload(username, lastUpload) {
        await this.users.updateOne({ username: username }, { $set: { lastUpload: lastUpload } });
    }

    /**
     * Get the badges of a user
     * @param {string} username username of the user 
     * @returns {Promise<Array<string>>} array of badges the user has
     * @async
     */
    async getBadges(username) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        return result.badges;
    }

    /**
     * Add a badge to a user
     * @param {string} username username of the user 
     * @param {string} badge the badge to add
     * @async
     */
    async addBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $push: { badges: badge } });
    }

    async setBadges(username, badges) {
        await this.users.updateOne({ username: username }, { $set: { badges: badges } });
    }

    /**
     * Check if a user has a badge
     * @param {string} username username of the user 
     * @param {string} badge badge to check for 
     * @returns {Promise<boolean>} true if the user has the badge, false if not
     */
    async hasBadge(username, badge) {
        const result = await this.users.findOne({ username: username });

        return result.badges.includes(badge);
    }

    /**
     * Remove a badge from a user
     * @param {string} username username of the user 
     * @param {string} badge the badge to remove 
     * @async
     */
    async removeBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $pull: { badges: badge } });
    }

    /**
     * Get a user's featured project
     * @param {string} username Username of the user
     * @returns {Promise<number>} ID of the user's favorite project
     */
    async getFeaturedProject(username) {
        const result = await this.users.findOne({ username: username });

        return result.featuredProject;
    }

    /**
     * Set a user's featured project
     * @param {string} username Username of the user 
     * @param {number} id ID of the project
     * @async
     */
    async setFeaturedProject(username, id) {
        await this.users.updateOne({
            username: username
        }, {
            $set: { featuredProject: id }
        });
    }

    /**
     * Get a user's featured project title
     * @param {string} username Username of the user
     * @returns {Promise<number>} Index of the title in the array of titles
     * @async
     */
    async getFeaturedProjectTitle(username) {
        const result = await this.users.findOne({ username: username });

        return result.featuredProjectTitle;
    }

    /**
     * Set a user's featured project title
     * @param {string} username Username of the user 
     * @param {number} title Index of the title in the array of titles
     * @async
     */
    async setFeaturedProjectTitle(username, title) {
        await this.users.updateOne({
            username: username
        }, {
            $set: { featuredProjectTitle: title }
        });
    }

    /**
     * Check if a user is an admin
     * @param {string} username 
     * @returns {Promise<boolean>} true if the user is an admin, false if not
     * @async
     */
    async isAdmin(username) {
        const result = await this.users.findOne({ username: username });

        return result.admin;
    }

    /**
     * Set a user as an admin
     * @param {string} username username of the user 
     * @param {boolean} admin true if setting to admin, false if not 
     * @async
     */
    async setAdmin(username, admin) {
        await this.users.updateOne({ username: username }, { $set: { admin: admin } });
    }

    /**
     * Check if a user is a moderator
     * @param {string} username username of the user
     * @returns {Promise<boolean>} true if the user is a moderator, false if not
     * @async
     */
    async isModerator(username) {
        const result = await this.users.findOne({ username: username });

        return result.moderator;
    }

    /**
     * Set a user as a moderator
     * @param {string} username username of the user
     * @param {boolean} moderator true if setting to moderator, false if not
     * @async
     */
    async setModerator(username, moderator) {
        await this.users.updateOne({ username: username }, { $set: { moderator: moderator } });
    }

    async isModeratorOrAdmin(username) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        return result.moderator || result.admin;
    }

    /**
     * Get all admins
     * @returns {Promise<Array<object>>} Array of all admins
     * @async
     */
    async getAllAdmins() {
        const result = (await this.users.find({ admin: true }).toArray())
        .map(admin => {
            return {id: admin.id, username: admin.username};
        })

        return result;
    }

    /**
     * Get all moderators
     * @returns {Promise<Array<Object>>} Array of all moderators
     * @async
     */
    async getAllModerators() {
        const result = (await this.users.find({ moderator: true }).toArray())
        .map(admin => {
            return {id: admin.id, username: admin.username};
        });

        return result;
    }

    /**
     * Check if a user is banned
     * @param {string} username username of the user
     * @returns {Promise<boolean>} true if the user is banned, false if not
     * @async
     */
    async isBanned(username) {
        const result = await this.users.findOne({ username: username });

        return result.permBanned || result.unbanTime > Date.now();
    }

    /**
     * Ban/unban a user
     * @param {string} username username of the user
     * @param {boolean} banned true if banning, false if unbanning
     * @async
     */
    async setPermBanned(username, banned, reason, remove_follows=false) {
        await this.users.updateOne({ username: username }, { $set: { permBanned: banned, banReason: reason } });
        
        const user_id = await this.getIDByUsername(username);
        await this.privateAllProjects(user_id, banned);

        // remove all reports by the user
        await this.reports.deleteMany({ reporter: user_id });

        // remove all reports on the user
        await this.reports.deleteMany({ reportee: user_id });

        if (remove_follows) {
            // get all references to the user in the followers collection

            const following = await this.followers.find({ follower: user_id }).toArray();

            for (const follow of following) {
                await this.followers.deleteOne({ _id: follow._id });
                // decrement the following count of the follower
                await this.users.updateOne({ id: follow.follower }, { $inc: { following: -1 } });
            }

            await this.followers.deleteMany({ target: user_id });
        }
    }

    /**
     * private all of a user's projects
     * @param {string} user_id id of the user
     * @param {boolean} toggle toggle for the privatization. true if you want them to be hidden, false if otherwise.
     */
    async privateAllProjects(user_id, toggle) {
        await this.projects.updateMany({
            author: user_id
        }, {
            $set: {
            
            public: !toggle

            }
        });
    }

    /**
     * Get the email of a user
     * @param {string} username username of the user
     * @returns {Promise<string>} email of the user
     * @async
     */
    async getEmail(username) {
        const result = await this.users.findOne({ username: username });

        if (!result) return false;

        return result.email;
    }

    /**
     * Set the email of a user
     * @param {string} username username of the user
     * @param {string} email email of the user
     * @async
     */
    async setEmail(username, email, verify=false) {
        await this.users.updateOne({ username: username }, { $set: { email: email, emailVerified: verify } });
    }

    /**
     * Logout a user
     * @param {string} username username of the user
     * @async
     */
    async logout(username) {
        await this.users.updateOne({ username: username }, { $set: { lastLogin: 0 } }); // makes the token invalid
    }

    /**
     * Report something
     * @param {number} type Type of report. 0 = user, 1 = project 
     * @param {string} reportee ID of the person/project being reported 
     * @param {string} reason Reason for the report 
     * @param {string} reporter ID of the person reporting 
     * @async
     */
    async report(type, reportee, reason, reporter) {
        await this.reports.insertOne({
            type: type,
            reportee: reportee,
            reason: reason,
            reporter: reporter,
            date: Date.now(),
            id: ULID.ulid()
        })
    }

    /**
     * Check if a report exists
     * @param {string} id ID of the report
     * @returns {Promise<boolean>} true if the report exists, false if not
     */
    async reportExists(id) {
        const result = await this.reports.findOne({ id: id });

        return result ? true : false;
    }

    /**
     * Get reports by type
     * @param {number} type The type of reports to get 
     * @param {number} page The page of reports to get
     * @param {number} pageSize The amount of reports to get
     * @returns {Promise<Array<object>>} Array of reports of the specified type
     * @async
     */
    async getReportsByType(type, page, pageSize) {
        const result = await this.reports.aggregate([
            {
                $match: { type: type }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id",
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Get reports by reportee
     * @param {string} reportee ID of the person/project being reported
     * @param {number} page The page of reports to get
     * @param {number} pageSize The amount of reports to get
     * @returns {Promise<Array<object>>} Array of reports on the specified reportee
     * @async
     */
    async getReportsByReportee(reportee, page, pageSize) {
        const result = await this.reports.aggregate([
            {
                $match: { reportee: reportee }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id",
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Get reports by reporter
     * @param {string} reporter ID of the person reporting
     * @param {number} page The page of reports to get
     * @param {number} pageSize The amount of reports to get
     * @returns {Promise<Array<object>>} Array of reports by the specified reporter
     * @async 
     */
    async getReportsByReporter(reporter, page, pageSize) {
        const result = await this.reports.aggregate([
            {
                $match: { reporter: reporter }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id",
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Check if a user has already reported a person/project
     * @param {string} reporter ID of the person reporting
     * @param {string} reportee ID of the person/project being reported
     * @returns {Promise<boolean>} true if the user has already reported the person/project, false if not
     */
    async hasAlreadyReported(reporter, reportee) {
        const result = await this.reports.findOne({ reporter: reporter, reportee: reportee });

        return result ? true : false;
    }

    /**
     * Get reports to a specified size
     * @param {number} page page of reports to get
     * @param {number} pageSize amount of reports to get
     * @returns {Promise<Array<object>>} Reports in the specified amount
     * @async
     */
    async getReports(page, pageSize) {
        const result = await this.reports.aggregate([
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Delete a report
     * @param {string} id ID of the report to delete
     * @async
     */
    async deleteReport(id) {
        await this.reports.deleteOne({ id: id });
    }

    /**
     * Publish a project
     * @param {Buffer} projectBuffer The json file buffer for the project.
     * @param {Array<Object>} assetBuffers Objects containing the 1. id of the asset and 2. the buffer of the asset.
     * @param {string} author The ID of the author of the project.
     * @param {string} title Title of the project.
     * @param {Buffer} imageBuffer The file buffer for the thumbnail.
     * @param {string} instructions The instructions for the project.
     * @param {string} notes The notes for the project
     * @param {String} remix ID of the project this is a remix of. Undefined if not a remix.
     * @param {string} rating Rating of the project.
     * @async
     */
    async publishProject(projectBuffer, assetBuffers, author, title, imageBuffer, instructions, notes, remix, rating) {
        let id;
        // ATODO: replace this with a ulid somehow
        // i love being whimsical ^^
        do {
            id = randomInt(0, 9999999999).toString();
            id = "0".repeat(10 - id.length) + id;
        } while (id !== 0 && await this.projects.findOne({id: id}));
        
        await this.projects.insertOne({
            id: id,
            author: author,
            title: title,
            instructions: instructions,
            notes: notes,
            remix: remix,
            featured: false,
            views: 0,
            date: Date.now(),
            lastUpdate: Date.now(),
            rating: rating,
            public: true,
            softRejected: false,
            hardReject: false,
            hardRejectTime: 0
        });

        // minio bucket stuff
        await this.minioClient.putObject("projects", id, projectBuffer);
        await this.minioClient.putObject("project-thumbnails", id, imageBuffer);
        for (const asset of assetBuffers) {
            await this.minioClient.putObject("project-assets", `${id}_${asset.id}`, asset.buffer);
        }

        await this.addToFeed(author, remix !== "0" ? "remix" : "upload", remix !== "0" ? remix : id);

        return id;
    }

    async isFeatured(projectId) {
        const result = await this.projects.findOne({id: projectId, featured: true});

        return !!result;
    }

    /**
     * Get remixes of a project
     * @param {number} id 
     * @returns {Promise<Array<Object>>} Array of remixes of the specified project
     * @async
     */
    async getRemixes(id, page, pageSize) {
        const aggResult = await this.projects.aggregate([
            {
                $match: { remix: id, public: true, softRejected: false }
            },
            {
                $sort: { lastUpdate: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                // collect author data
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo"
                }
            },
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "_id",
                    "authorInfo"
                ]
            }
        ])
        .toArray();

        return aggResult;
    }

    /**
     * Update a project
     * @param {number} id ID of the project 
     * @param {Buffer|null} projectBuffer The file buffer for the project. This is a zip.
     * @param {Array<Object>|null} assetBuffers asset buffers
     * @param {string} title Title of the project.
     * @param {Buffer|null} imageBuffer The file buffer for the thumbnail.
     * @param {string} instructions The instructions for the project.
     * @param {string} notes The notes for the project 
     * @param {string} rating Rating of the project. 
     * @async
     */
    async updateProject(id, projectBuffer, assetBuffers, title, imageBuffer, instructions, notes, rating) {
        if (projectBuffer === null && assetBuffers !== null || projectBuffer !== null && assetBuffers === null) {
            return false;
        }

        await this.projects.updateOne({id: id},
            {$set: {
                title: title,
                instructions: instructions,
                notes: notes,
                rating: rating,
                lastUpdate: Date.now()
            }}
        );

        // minio bucket stuff
        if (imageBuffer !== null) {
            await this.minioClient.putObject("project-thumbnails", id, imageBuffer);
        }

        if (projectBuffer !== null) {
            await this.minioClient.putObject("projects", id, projectBuffer);

            await this.deleteMultipleObjects("project-assets", id); // delete all the old assets
            // ATODO: instead of doing this just replace the ones that were edited
            // potentially we could just see which ones are new/not in use, since asset ids are meant to be the hash of the file?

            for (const asset of assetBuffers) {
                await this.minioClient.putObject("project-assets", `${id}_${asset.id}`, asset.buffer);
            }
        }

        return true;
    }

    /**
     * get projects to a specified size
     * @param {boolean} show_nonranked show projects from non-ranked users
     * @param {number} page page of projects to get
     * @param {number} pageSize amount of projects to get
     * @param {boolean} reverse if you should get newest or oldest first
     * @returns {Promise<Array<Object>>} Projects in the specified amount
     * @async
     */
    async getProjects(show_nonranked, page, pageSize, maxLookup, reverse=false) {
        let pipeline = [
            {
                $match: { softRejected: false, hardReject: false, public: true }
            },
            {
                $sort: { lastUpdate: -1*(!reverse) }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: maxLookup,
            }
        ];

        if (!show_nonranked) {
            // get author data
            pipeline.push(
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo"
                    },
                },
                { $match: { "authorInfo.rank": { $gt: 0 } } }
            );
        }

        pipeline.push(
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
        );

        if (show_nonranked) {
            pipeline.push(
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo"
                    }
                }
            );
        }

        pipeline.push(
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "_id",
                    "authorInfo"
                ]
            }
        );

        const aggResult = await this.projects.aggregate(pipeline)
        .toArray()

        /*
        const final = []
        for (const project of aggResult[0].data) {
            delete project._id;
            project.author = {
                id: project.author,
                username: project.authorInfo[0].username
            }
            delete project.authorInfo; // dont include sensitive info!!!
            final.push(project);
        }

        return final;*/
        return aggResult;
    }

    async getRandomProjects(size) {
        const result = await this.projects.aggregate([
            {
                $match: { softRejected: false, hardReject: false, public: true }
            },
            {
                $sample: { size }
            },
            {
                $unset: "_id"
            }
        ]).toArray();

        return result;
    }

    /**
     * Get projects by a specified author
     * @param {string} author ID of the author
     * @returns {Promise<Array<Object>>} Array of projects by the specified author
     * @async
     */
    async getProjectsByAuthor(author, page, pageSize, getPrivate=false, getSoftRejected=false) {
        const match = { author: author, hardReject: false }
        if (!getPrivate) match.public = true;
        if (!getSoftRejected) match.softRejected = false;
        const _result = await this.projects.aggregate([
            {
                $match: match
            },
            {
                $sort: { lastUpdate: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();
        // you dont need to give it the user's username as... well... you prob already know it....

        return _result;
    }

    /**
     * Read an object from a bucket
     * @param {string} bucketName Name of the bucket
     * @param {string} objectName Name of the object
     * @returns {Promise<Buffer>} The object
     */
    async readObjectFromBucket(bucketName, objectName) {
        const stream = await this.minioClient.getObject(bucketName, objectName);

        const chunks = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", (err) => {console.log("ERROR" + err);reject(err)});
        });
    }

    /**
     * Get a project file
     * @param {number} id ID of the project wanted.
     * @returns {Promise<Buffer>} The project file.
     * @async
     */
    async getProjectFile(id) {
        console.log(`pre ${id} ${typeof(id)}`);
        const file = await this.readObjectFromBucket("projects", id);
        console.log("post");

        return file;
    }

    /**
     * Get a project image
     * @param {number} id ID of the project image wanted. 
     * @returns {Promise<Buffer>} The project image file.
     */
    async getProjectImage(id) {
        // check if the file exists
        if (!await this.minioClient.bucketExists("project-thumbnails")) {
            return false;
        }

        let file;

        try {
            file = await this.readObjectFromBucket("project-thumbnails", id);
        } catch (e) {
            return false;
        }

        return file;
    }

    /**
     * Delete objects from a bucket with a specified prefix
     * @param {string} bucketName Name of the bucket 
     * @param {*} prefix Prefix to search
     */
    async deleteMultipleObjects(bucketName, prefix) {
        const stream = this.minioClient.listObjects(bucketName, prefix);

        const chunks = [];

        stream.on("data", (chunk) => chunks.push(chunk.name));
        stream.on("error", (err) => console.log("Error listing objects:", err));
        stream.on("end", () => {
            const names = chunks.map((chunk) => {
                return chunk.split("_")[1];
            })
            this.minioClient.removeObjects(bucketName, names, (err) => {
                if (err) {
                    console.log("Error removing objects:", err);
                }
            });
        });
    }

    /**
     * Get a projects assets
     * @param {string} id ID of the project
     * @returns {Promise<Array<Object>>} Array of project assets
     */
    async getProjectAssets(id) {
        const stream = this.minioClient.listObjects("project-assets", id);

        // deal with the object stream :sob:

        const chunks = [];

        // :canny:
        const items = await new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(chunk.name));
            stream.on("end", () => resolve(chunks));
            stream.on("error", (err) => reject(err));
        });

        const result = [];

        for (const item of items) {
            const file = await this.readObjectFromBucket("project-assets", item);
            result.push({id: item.split("_")[1], buffer: file});
        }

        return result;
    }

    /**
     * Get project metadata for a specified project
     * @param {String} id ID of the project wanted.
     * @returns {Promise<Object>} The project data.
     * @async
     */
    async getProjectMetadata(id) {
        const p_id = String(id);

        const tempresult = await this.projects.findOne({id: p_id});

        if (!tempresult) return false;

        tempresult.author = {
            id: tempresult.author,
            username: await this.getUsernameByID(tempresult.author)
        }

        // add the views, loves, and votes
        const result = {
            ...tempresult,
            loves: await this.getProjectLoves(p_id),
            votes: await this.getProjectVotes(p_id),
        }

        return result;
    }

    /**
     * Check if a user has seen a project
     * @param {number} id ID of the project. 
     * @param {string} ip IP we are checking
     * @returns {Promise<boolean>} True if they have seen the project, false if not. 
     * @async
     */
    async hasSeenProject(id, ip) {
        const result = this.views.find((view) => view.id === id && view.ip === ip);

        return result ? true : false;
    }

    /**
     * Add a view to a project
     * @param {number} id ID of the project.
     * @param {string} ip IP of the person seeing the project.
     * @async
     */
    async projectView(id, ip) {
        if (this.views.length >= this.maxviews ||
            Date.now() - this.prevReset >= this.viewresetrate
        ) {
            this.views = [];
            this.prevReset = Date.now();
        }

        this.views.push({id: id, ip: ip});
        await this.projects.updateOne({id: id}, {$inc: {views: 1}});
    }

    /**
     * Get the amount of views a project has
     * @param {number} id ID of the project
     * @returns {Promise<number>} The number of views the project has
     */
    async getProjectViews(id) {
        const result = this.projects.findOne({ id: id });

        return result.views;
    }

    /**
     * Check if a user has loved a project
     * @param {number} id ID of the project.
     * @param {string} userId ID of the person loving the project.
     * @returns {Promise<boolean>} True if they have loved the project, false if not.
     * @async
     */
    async hasLovedProject(id, userId) {
        const result = await this.projectStats.findOne({
            projectId: id,
            userId: userId,
            type: "love"
        });

        return result ? true : false
    }

    /**
     * Love/unlove a project
     * @param {number} id ID of the project.
     * @param {string} userId ID of the person loving the project.
     * @param {boolean} love True if loving, false if unloving.
     * @async
     */
    async loveProject(id, userId, love) {
        if (love) {
            await this.projectStats.insertOne({
                projectId: id,
                userId: userId,
                type: "love"
            });
            return;
        }
        await this.projectStats.deleteOne({
            projectId: id,
            userId: userId,
            type: "love"
        });
    }

    /**
     * Get the amount of loves a project has
     * @param {number} id ID of the project
     * @returns {Promise<number>} Amount of loves the project has
     */
    async getProjectLoves(id) {
        const result = await this.projectStats.find({projectId: id, type: "love"}).toArray();

        return result.length;
    }

    /**
     * Get who loved a project
     * @param {string} projectID ID of the project
     * @param {number} page Page to get
     * @param {number} pageSize Page size
     * @returns {Array<string>} Array of user ids
     */
    async getWhoLoved(projectID, page, pageSize) {
        const result = await this.projectStats.aggregate([
            {
                $match: { projectId: projectID, type: "love" }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Get who voted for a project
     * @param {string} projectID ID of the project
     * @param {number} page Page to get
     * @param {number} pageSize Page size
     * @returns {Array<string>} Array of user ids
     */
    async getWhoVoted(projectID, page, pageSize) {
        const result = await this.projectStats.aggregate([
            {
                $match: { projectId: projectID, type: "vote" }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Check if a user has voted on a project
     * @param {number} id ID of the project.
     * @param {string} userId ID of the person voting on the project.
     * @returns {Promise<boolean>} True if they have voted on the project, false if not.
     * @async
     */
    async hasVotedProject(id, userId) {
        const result = await this.projectStats.findOne({
            projectId: id,
            userId: userId,
            type: "vote"
        });

        return result ? true : false;
    }

    /**
     * Vote/unvote a project
     * @param {number} id ID of the project.
     * @param {string} userId ID of the person voting on the project.
     * @param {boolean} vote True if voting, false if unvoting.
     * @async
     */
    async voteProject(id, userId, vote) {
        if (vote) {
            await this.projectStats.insertOne({
                projectId: id,
                userId: userId,
                type: "vote"
            });
            return;
        }
        await this.projectStats.deleteOne({
            projectId: id,
            userId: userId,
            type: "vote"
        });
    }

    /**
     * Get the amount of votes a project has
     * @param {number} id ID of the project
     * @returns {Promise<number>} Amount of votes the project has
     * @async
     */
    async getProjectVotes(id) {
        const result = await this.projectStats.find({projectId: id, type: "vote"}).toArray();

        return result.length;
    }

    /**
     * Get a list of featured projects to a specified size
     * @param {number} page page of projects to get
     * @param {number} pageSize amount of projects to get
     * @returns {Promise<Array<Object>>} Array of all projects
     * @async
     */
    async getFeaturedProjects(page, pageSize) {
        const aggResult = await this.projects.aggregate([
            {
                $match: { featured: true, public: true, softRejected: false, hardReject: false }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                // collect author data
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo"
                }
            },
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "_id",
                    "authorInfo"
                ]
            }
        ])
        .toArray();

        return aggResult;
    }

    /**
     * Feature/unfeature a project
     * @param {number} id ID of the project.
     * @param {boolean} feature True if featuring, false if unfeaturing.
     * @async
     */
    async featureProject(id, feature) {
        await this.projects.updateOne({id: id}, {$set: {featured: feature}});
    }

    /**
     * Set a projects metadata
     * @param {string} id ID of the project
     * @param {Object} data Data to set
     */
    async setProjectMetadata(id, data) {
        await this.projects.updateOne({id: id}, {$set: data});
    }

    /**
     * Get the amount of projects
     * @returns {Promise<number>} Amount of projects
     * @async
     */
    async getProjectCount() {
        const result = await this.projects.countDocuments();

        return result;
    }

    /**
     * delete a project
     * @param {number} id ID of the project
     * @async
     */
    async deleteProject(id) {
        await this.projects.deleteOne({id: id});

        // remove the loves and votes
        await this.projectStats.deleteMany({projectId: id});

        // remove the project file
        await this.minioClient.removeObject("projects", id);
        await this.minioClient.removeObject("project-thumbnails", id);
        this.deleteMultipleObjects("project-assets", id);
    }

    async hardRejectProject(id) {
        // ATODO: test this

        // just mark as hard rejected, mongodb will do the rest
        // have to separate so the index doesnt delete prematurely
        await this.projects.updateOne({id: id}, { $set: { hardRejectTime: new Date() } });
        await this.projects.updateOne({id: id}, { $set: { hardReject: true           } });
    }

    async isHardRejected(id) {
        const result = await this.projects.findOne({id: id});

        return result.hardReject;
    }

    /**
     * Follow/unfollow a user
     * @param {string} follower ID of the person following 
     * @param {string} followee ID of the person being followed
     * @param {boolean} follow True if following, false if unfollowing
     * @async
     */
    async followUser(follower, followee, follow) {
        const existing = await this.followers.findOne({ follower, target: followee })

        if (existing) {
            if (existing.active === follow) {
                return
            }

            await this.followers.updateOne({ follower, target: followee }, { $set: { active: follow } });
        } else {
            await this.followers.insertOne({ follower, target: followee, active: follow})
        }

        await this.users.updateOne({ id: follower }, { $inc: { following: follow ? 1 : -1 } });
        await this.users.updateOne({ id: followee }, { $inc: { followers: follow ? 1 : -1 } });
    }

    /**
     * Check if a user is following another user
     * @param {string} follower ID of the person following
     * @param {string} followee ID of the person being followed
     * @returns {Promise<boolean>} True if they are following, false if not
     * @async
     */
    async isFollowing(follower, followee) {
        const result = await this.followers.findOne({ follower, target: followee, active: true });

        return result ? true : false;
    }

    /**
     * Get the people a person is being followed by
     * @param {string} username username of the person
     * @param {number} page page of followers to get
     * @param {number} pageSize amount of followers to get
     * @returns {Promise<Array<string>>} Array of the people the person is being followed by
     * @async
     */
    async getFollowers(username, page, pageSize) {
        const id = await this.getIDByUsername(username);
        const result = await this.followers.aggregate([
            {
                $match: { target: id, active: true }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                // collect author data
                $lookup: {
                    from: "users",
                    localField: "follower",
                    foreignField: "id",
                    as: "followerInfo"
                }
            },
            {
                $addFields: {
                    "follower": {
                        id: "$follower",
                        username: { $arrayElemAt: ["$followerInfo.username", 0] },
                        banned: { $arrayElemAt: ["$followerInfo.permBanned", 0] }
                    }
                }
            },
            {
                $match: {
                    "follower.banned": false
                }
            },
            {
                // only leave the follower field
                $replaceRoot: { newRoot: "$follower" }
            }
            // get the usernames of the followers
            
        ])
        .toArray();

        return result;
    }

    /**
     * Get the people a person is following
     * @param {string} id username of the person
     * @returns {Promise<Array<string>>} Array of the people the person is following
     * @async
     */
    async getFollowing(username, page, pageSize) {
        const result = await this.followers.aggregate([
            {
                $match: { follower: username, active: true }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                // change it to just the target
                $project: { target: 1 }
            },
            {
                // we have the target field only, now we need to have it just be the value of the field
                $replaceRoot: { newRoot: "$target" }
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Check if a person has ever followed another person
     * @param {string} follower ID of the person following
     * @param {*} followee ID of the person being followed
     * @returns {Promise<boolean>} True if the person has followed/is following the other person, false if not
     */
    async hasFollowed(follower, followee) {
        const result = await this.followers.findOne({ follower, target: followee });

        return result ? true : false
    }

    /**
     * Get the amount of people following a user
     * @param {string} username Username of the user
     * @returns {Promise<number>} Amount of people following the user
     */
    async getFollowerCount(username) {
        const result = await this.users.findOne({username: username});

        return result.followers;
    }

    /**
     * Send a message
     * @param {string} receiver ID of the person receiving the message
     * @param {string} message The message should follow the format specified in the schema
     * @param {boolean} disputable True if the message is disputable, false if not
     * @returns {Promise<string>} ID of the message
     * @async
     */
    async sendMessage(receiver, message, disputable, projectID=0) {
        const id = ULID.ulid();

        await this.messages.insertOne({
            receiver: receiver,
            message: message,
            disputable: disputable,
            date: Date.now(),
            read: false,
            id: id,
            projectID: projectID
        });

        return id;
    }

    /**
     * Get messages sent to a person
     * @param {string} receiver ID of the person receiving the message
     * @param {number} page page of messages to get
     * @param {number} pageSize amount of messages to get
     * @returns {Promise<Array<Object>>} Array of the messages sent to the person
     * @async
     */
    async getMessages(receiver, page, pageSize) {
        const result = await this.messages.aggregate([
            {
                $match: { receiver: receiver }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Get the amount of messages sent to a person
     * @param {string} receiver ID of the person who received the messages 
     * @returns {Promise<number>} Amount of messages sent to the person
     */
    async getMessageCount(receiver) {
        const result = await this.messages.countDocuments({receiver: receiver});

        return result;
    }

    /**
     * Get a message
     * @param {string} messageID ID of the message
     * @returns {Promise<Object>} The message
     */
    async getMessage(messageID) {
        const result = await this.messages.findOne({ id: messageID });

        return result;
    }

    /**
     * Get unread messages sent to a person
     * @param {string} receiver ID of the person you're getting the messages from
     * @returns {Promise<Array<Object>>} Array of the unread messages sent to the person
     * @async
     */
    async getUnreadMessages(receiver, page, pageSize) {
        const result = await this.messages.aggregate([
            {
                $match: { receiver: receiver, read: false }
            },
            {
                $sort: { date: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $unset: "_id"
            }
        ])
        .toArray();

        return result;
    }

    async getUnreadMessageCount(receiver) {
        const result = await this.messages.countDocuments({receiver: receiver, read: false});

        return result;
    }

    /**
     * Modify a message
     * @param {string} id ID of the message
     * @param {function} modifierFunction the function that modifies the message
     * @async
     */
    async modifyMessage(id, modifierFunction) {
        const result = await this.messages.findOne({id: id});

        await this.messages.updateOne({id: id}, modifierFunction(result));
    }

    /**
     * Mark a message as read
     * @param {string} id ID of the message
     * @param {boolean} read Toggle between read and not read
     */
    async markMessageAsRead(id, read) {
        await this.messages.updateOne({id: id}, {$set: {read: read}});
    }

    async messageExists(id) {
        const result = await this.messages.findOne({id: id});

        return result ? true : false;
    }

    /**
     * Mark all messages sent to a user as read
     * @param {string} receiver ID of the person receiving the messages
     */
    async markAllMessagesAsRead(receiver) {
        await this.messages.updateMany({receiver: receiver}, {$set: {read: true}});
    }

    /**
     * Delete a message
     * @param {string} id ID of the message
     * @async
     */
    async deleteMessage(id) {
        await this.messages.deleteOne({id: id});
    }

    /**
     * Check if a message is disputable
     * @param {string} id ID of the message
     * @returns {Promise<boolean>} True if the message is disputable, false if not
     */
    async isMessageDisputable(id) {
        const result = await this.messages.findOne({id: id});

        return result.disputable;
    }

    /**
     * Dispute a message
     * @param {string} id ID of the message
     * @param {string} dispute The dispute
     */
    async dispute(id, dispute) {
        await this.messages.updateOne({id: id}, {$set: {dispute: dispute, disputable: false}});

        // to respond to a dispute you just send another message
    }

    /**
     * Check if a project exists
     * @param {string} id ID of the project
     * @returns {Promise<boolean>} True if the project exists, false if not
     * @async
     */
    async projectExists(id, nonPublic) {
        const result = nonPublic ? 
            await this.projects.findOne({id: String(id)}) :
            await this.projects.findOne({id: String(id), public: true});

        return result ? true : false;
    }

    /**
     * Check for illegal wording on text
     * @param {string} text The text to check for illegal wording 
     * @returns {Promise<String>} Empty if there is nothing illegal, not empty if it was triggered (returns the trigger)
     * @async
     */
    async checkForIllegalWording(text) {
        let illegalWords = (await this.illegalList.findOne
            ({ id: "illegalWords" })).items;
        let illegalWebsites = (await this.illegalList.findOne
            ({ id: "illegalWebsites" })).items;
        let spacedOutWordsOnly = (await this.illegalList.findOne
            ({ id: "spacedOutWordsOnly" })).items;

        illegalWords = illegalWords ? illegalWords : [];
        illegalWebsites = illegalWebsites ? illegalWebsites : [];
        spacedOutWordsOnly = spacedOutWordsOnly ? spacedOutWordsOnly : [];

        const joined = illegalWords.concat(illegalWebsites);
        
        const no_spaces = text.replace(/\s/g, "");

        for (const item of joined) {
            if (no_spaces.includes(item)) {
                return item;
            }
        }

        for (const item of spacedOutWordsOnly) {
            const with_spaces = " " + item + " ";

            if (text.includes(with_spaces)) {
                return item;
            }
        }

        return "";
    }

    /**
     * Get the index of illegal wording
     * @param {string} text Text to get the index from
     * @returns {Promise<number>} Index of the illegal wording
     */
    async getIndexOfIllegalWording(text) {
        const illegalWords = (await this.illegalList.findOne
            ({ id: "illegalWords" })).items;
        const illegalWebsites = (await this.illegalList.findOne
            ({ id: "illegalWebsites" })).items;
        const spacedOutWordsOnly = (await this.illegalList.findOne
            ({ id: "spacedOutWordsOnly" })).items;
        const joined = illegalWords.concat(illegalWebsites);

        const no_spaces = text.replace(/\s/g, "");
        
        for (const item of joined) {
            const index = no_spaces.indexOf(item)
            if (index + 1) {
                return [index, index+item.length];
            }
        }

        for (const item of spacedOutWordsOnly) {
            const with_spaces = " " + item + " ";
            const index = text.indexOf(with_spaces)
            if (index + 1) {
                return [index, index+item.length];
            }
        }
    }

    /**
     * Check for slightly illegal wording on text
     * @param {string} text The text to check for slightly illegal wording
     * @returns {Promise<String>} same as normal illegal
     * @async
     */
    async checkForSlightlyIllegalWording(text) {
        let potentiallyUnsafeWords = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWords" })).items;
        let potentiallyUnsafeWordsSpacedOut = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWordsSpacedOut" })).items;

        potentiallyUnsafeWords = potentiallyUnsafeWords ? potentiallyUnsafeWords : [];
        potentiallyUnsafeWordsSpacedOut = potentiallyUnsafeWordsSpacedOut ? potentiallyUnsafeWordsSpacedOut : [];
        
        for (const item of potentiallyUnsafeWords) {
            if (text.includes(item)) {
                return item;
            }
        }

        for (const item of potentiallyUnsafeWordsSpacedOut) {
            const with_spaces = " " + item + " ";
            if (text.includes(with_spaces)) {
                return item;
            }
        }

        return "";
    }

    /**
     * Get the index of slightly illegal wording
     * @param {string} text Text to get the index from
     * @returns {Promise<number>} Index of the slightly illegal wording
     */
    async getIndexOfSlightlyIllegalWording(text) {
        const potentiallyUnsafeWords = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWords" })).items;
        const potentiallyUnsafeWordsSpacedOut = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWordsSpacedOut" })).items;
        const joined = potentiallyUnsafeWords.concat(potentiallyUnsafeWordsSpacedOut);
        
        for (const item of joined) {
            const index = text.indexOf(item)
            if (index + 1) {
                return [index, index+item.length];
            }
        }
    }

    /**
     * Set a new list of illegal words
     * @param {Array<string>} words The new list of illegal words
     * @param {string} type The type of the illegal item
     * @async
     */
    async setIllegalWords(type, words) {
        await this.illegalList.updateOne({id: type}, {$set: {items: words}});
    }

    /**
     * Add an illegal word
     * @param {string} word The item to add
     * @param {string} type The type of the illegal item
     * @async
     */
    async addIllegalWord(word, type) {
        await this.illegalList.updateOne({id: type}, {$push: {items: word}});
    }

    /**
     * Remove an illegal word
     * @param {string} word The item to remove 
     * @param {string} type The type of the illegal item
     * @async
     */
    async removeIllegalWord(word, type) {
        await this.illegalList.updateOne({id: type}, {$pull: {items: word}});
    }

    /**
     * Get all illegal words
     * @returns {Promise<Object>} Object containing all the illegal words
     * @async
     */
    async getIllegalWords() {
        const illegalWords = (await this.illegalList.findOne
            ({ id: "illegalWords" })).items;
        const illegalWebsites = (await this.illegalList.findOne
            ({ id: "illegalWebsites" })).items;
        const spacedOutWordsOnly = (await this.illegalList.findOne
            ({ id: "spacedOutWordsOnly" })).items;
        const potentiallyUnsafeWords = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWords" })).items;
        const potentiallyUnsafeWordsSpacedOut = (await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWordsSpacedOut" })).items;
        const legalExtensions = await this.getLegalExtensions();

        return {
            illegalWords,
            illegalWebsites,
            spacedOutWordsOnly,
            potentiallyUnsafeWords,
            potentiallyUnsafeWordsSpacedOut,
            legalExtensions
        }
    }

    /**
     * Verify the state from an OAuth2 request
     * @param {string} state The state to verify 
     * @returns {Promise<boolean>} True if the state is valid, false if not
     * @async
     */
    async verifyOAuth2State(state) {
        const result = await this.oauthStates.findOne({ state: state, expireAt: { $gt: Date.now() } });

        // now get rid of the state cuz uh we dont need it anymore

        if (result)
        await this.oauthStates.deleteOne({ state: state })

        return result ? true : false;
    }

    /**
     * Generate a new OAuth2 state and save it for verification
     * @returns {Promise<string>} The state
     */
    async generateOAuth2State(extra="") {
        const state = (randomBytes(32).toString("base64") + extra).replaceAll("+", "-");

        await this.oauthStates.insertOne({
            state: state,
            expireAt: Date.now() + 1000 * 60 * 5
        });

        return state;
    }

    /**
     * Make an OAuth2 request
     * @param {string} code The from the original OAuth2 request
     * @param {string} method The method of OAuth2 request
     * @returns 
     */
    async makeOAuth2Request(code, method) {
        let response;
        try {
            switch (method) {
                case "scratch":
                    response = await fetch(`https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/tokens`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            client_id: Number(process.env.ScratchOAuthClientID),
                            client_secret: process.env.ScratchOAuthClientSecret,
                            code: code,
                            scopes: ["identify"]
                        })
                    }).then(res => res.json());
                    return response;
                case "github":
                    response = await fetch(`https://github.com/login/oauth/access_token`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Accept": "application/json"
                        },
                        body: JSON.stringify({
                            client_id: process.env.GithubOAuthClientID,
                            client_secret: process.env.GithubOAuthClientSecret,
                            code: code
                        })
                    }).then(res => res.json());
                    return response;
            }
        } catch (e) {
            return false;
        }
    }

    async makeOAuth2Account(method, data, utils, res) {
        let username, id, real_username;
        switch (method) {
            case "scratch":
                username = data.user_name.toLowerCase();
                real_username = data.user_name;
                id = data.user_id;
                break;
            case "google":
                id = data.id;
                username = data.username.toLowerCase();
                real_username = data.username;
                break;
            case "github":
                try {
                    username = String(data.login).toLowerCase();
                    real_username = String(data.login);
                } catch(e) {
                    console.error("it broke", data, e);
                    throw e;
                }
                id = data.id;
                break;
        }

        let n = 1;
        let orig_username = username;
        while (await this.existsByUsername(username)) {
            username = `${orig_username}${n}`;
            n++;
        }

        const info = await this.createAccount(username, real_username, null, null, null, null, false, utils, res)
        const token = info[0];
        const pm_id = info[1];

        await this.addOAuthMethod(username, method, id);
        return { token, username, id: pm_id };
    }

    /**
     * Convert a project json to protobuf format
     * @param {Object} json The project json 
     * @returns {Buffer} The project protobuf
     */
    projectJsonToProtobuf(json) {
        // get the protobuf schema
        let file = protobuf.loadSync("./api/v1/db/protobufs/project.proto");
        const schema = file.lookupType("Project");

        let newjson = {
            targets: [],
            monitors: [],
            extensionData: {},
            extensions: json.extensions,
            extensionURLs: {},
            metaSemver: "",
            metaVm: "",
            metaAgent: "",
            fonts: json.fonts,
        }

        newjson.metaSemver = json.meta.semver;
        newjson.metaVm = json.meta.vm;
        newjson.metaAgent = json.meta.agent;

        for (const target in json.targets) {

            let newtarget = {
                id: json.targets[target].id,
                isStage: json.targets[target].isStage,
                name: json.targets[target].name,
                variables: {},
                lists: {},
                broadcasts: {},
                customVars: [],
                blocks: {},
                comments: {},
                currentCostume: json.targets[target].currentCostume,
                costumes: [],
                sounds: [],
                volume: json.targets[target].volume,
                layerOrder: json.targets[target].layerOrder,
                x: json.targets[target].x,
                y: json.targets[target].y,
                size: json.targets[target].size,
                direction: json.targets[target].direction,
                draggable: json.targets[target].draggable,
                rotationStyle: json.targets[target].rotationStyle,
                tempo: json.targets[target].tempo,
                videoTransparency: json.targets[target].videoTransparency,
                videoState: json.targets[target].videoState,
                textToSpeechLanguage: json.targets[target].textToSpeechLanguage,
                visible: json.targets[target].visible,
            }

            // loop over the variables
            for (const variable in json.targets[target].variables) {
                newtarget.variables[variable] = {
                    name: json.targets[target].variables[variable][0],
                    value: this.castToString(json.targets[target].variables[variable][1])
                }
            }

            // loop over the lists
            for (const list in json.targets[target].lists) {
                newtarget.lists[list] = {
                    name: list,
                    value: json.targets[target].lists[list].map(x => this.castToString(x))
                }
            }

            // loop over the broadcasts
            for (const broadcast in json.targets[target].broadcasts) {
                newtarget.broadcasts[broadcast] = json.targets[target].broadcasts[broadcast];
            }

            for (const customVar in json.targets[target].customVars) {
                newtarget.customVars.push({
                    name: json.targets[target].customVars[customVar].name,
                    value: this.castToString(json.targets[target].customVars[customVar].value),
                    type: json.targets[target].customVars[customVar].type,
                    id: json.targets[target].customVars[customVar].id
                });
            }

            const blocks = json.targets[target].blocks;
            // loop over the blocks
            for (const block in blocks) {
                if (Array.isArray(blocks[block])) {
                    newtarget.blocks[block] = {
                        is_variable_reporter: true,
                        varReporterBlock: {
                            first_num: target.blocks[block][0],
                            name: target.blocks[block][1],
                            id: target.blocks[block][2],
                            second_num: target.blocks[block][3],
                            third_num: target.blocks[block][4],
                        }
                    };
                    continue;
                }
                
                newtarget.blocks[block] = {
                    opcode: blocks[block].opcode,
                    next: blocks[block].next,
                    parent: blocks[block].parent,
                    inputs: {},
                    fields: {},
                    shadow: blocks[block].shadow,
                    topLevel: blocks[block].topLevel,
                    x: blocks[block].x,
                    y: blocks[block].y,
                    is_variable_reporter: false,
                }

                if (blocks[block].mutation) {
                    newtarget.blocks[block].mutation = {
                        tagName: blocks[block].mutation.tagName,
                        proccode: blocks[block].mutation.proccode,
                        argumentids: blocks[block].mutation.argumentids,
                        argumentnames: blocks[block].mutation.argumentnames,
                        argumentdefaults: blocks[block].mutation.argumentdefaults,
                        warp: blocks[block].mutation.warp,
                        _returns: blocks[block].mutation.returns,
                        edited: blocks[block].mutation.edited,
                        optype: blocks[block].mutation.optype,
                        color: blocks[block].mutation.color
                    }
                }

                // loop over the inputs
                for (const input in blocks[block].inputs) {
                    newtarget.blocks[block].inputs[input] = JSON.stringify(blocks[block].inputs[input]);
                }

                // loop over the fields
                for (const field in blocks[block].fields) {
                    newtarget.blocks[block].fields[field] = JSON.stringify(blocks[block].fields[field]);
                }
            }

            // loop over the comments
            for (const comment in json.targets[target].comments) {
                newtarget.comments[comment] = {
                    blockId: json.targets[target].comments[comment].blockId,
                    x: json.targets[target].comments[comment].x,
                    y: json.targets[target].comments[comment].y,
                    width: json.targets[target].comments[comment].width,
                    height: json.targets[target].comments[comment].height,
                    minimized: json.targets[target].comments[comment].minimized,
                    text: json.targets[target].comments[comment].text
                }
            }

            // loop over the costumes
            for (const costume in json.targets[target].costumes) {
                newtarget.costumes[costume] = {
                    assetId: json.targets[target].costumes[costume].assetId,
                    name: json.targets[target].costumes[costume].name,
                    bitmapResolution: json.targets[target].costumes[costume].bitmapResolution,
                    rotationCenterX: json.targets[target].costumes[costume].rotationCenterX,
                    rotationCenterY: json.targets[target].costumes[costume].rotationCenterY,
                    md5ext: json.targets[target].costumes[costume].md5ext,
                    dataFormat: json.targets[target].costumes[costume].dataFormat,
                }
            }

            // loop over the sounds
            for (const sound in json.targets[target].sounds) {
                newtarget.sounds[sound] = {
                    assetId: json.targets[target].sounds[sound].assetId,
                    name: json.targets[target].sounds[sound].name,
                    dataFormat: json.targets[target].sounds[sound].dataFormat,
                    rate: json.targets[target].sounds[sound].rate,
                    sampleCount: json.targets[target].sounds[sound].sampleCount,
                    md5ext: json.targets[target].sounds[sound].md5ext
                }
            }

            newjson.targets.push(newtarget);
        }

        // loop over the monitors
        for (const monitor in json.monitors) {
            newjson.monitors.push({
                id: json.monitors[monitor].id,
                mode: json.monitors[monitor].mode,
                opcode: json.monitors[monitor].opcode,
                params: json.monitors[monitor].params,
                spriteName: json.monitors[monitor].spriteName,
                value: String(json.monitors[monitor].value),
                width: json.monitors[monitor].width,
                height: json.monitors[monitor].height,
                x: json.monitors[monitor].x,
                y: json.monitors[monitor].y,
                visible: json.monitors[monitor].visible,
                sliderMin: json.monitors[monitor].sliderMin,
                sliderMax: json.monitors[monitor].sliderMax,
                isDiscrete: json.monitors[monitor].isDiscrete,
            });
        }

        // loop over the extensionData
        for (const extensionData in json.extensionData) {
            newjson.extensionData[extensionData] = {
                data: castToString(json.extensionData[extensionData]),
                // true if the extension data is not a string
                parse: typeof json.extensionData[extensionData] !== "string"
            }
        }

        // loop over the extensionURLs
        for (const extensionURL in json.extensionURLs) {
            newjson.extensionURLs[extensionURL] = json.extensionURLs[extensionURL];
        }

        // encode the json
        let buffer = schema.encode(newjson).finish();

        return buffer;
    }

    /**
     * Convert a project protobuf to json format
     * @param {Buffer} buffer The project protobuf
     * @returns {Object} The project json
     */
    protobufToProjectJson(buffer) {
        // get the protobuf schema
        let file = protobuf.loadSync("api/v1/db/protobufs/project.proto");
        const schema = file.lookupType("Project");

        // decode the buffer
        const json = schema.toObject(schema.decode(buffer));

        const newJson = {
            targets: [],
            monitors: [],
            extensionData: {},
            extensions: json.extensions,
            extensionURLs: {},
            meta: {
                semver: json.metaSemver,
                vm: json.metaVm,
                agent: json.metaAgent || ""
            },
            customFonts: json.fonts
        };

        for (const target of json.targets) {
            let newTarget = {
                isStage: target.isStage,
                name: target.name,
                variables: {},
                lists: {},
                broadcasts: {},
                customVars: [],
                blocks: {},
                comments: {},
                currentCostume: target.currentCostume,
                costumes: [],
                sounds: [],
                id: target.id,
                volume: target.volume,
                layerOrder: target.layerOrder,
                tempo: target.tempo,
                videoTransparency: target.videoTransparency,
                videoState: target.videoState,
                textToSpeechLanguage: target.textToSpeechLanguage || null,
                visible: target.visible,
                x: target.x,
                y: target.y,
                size: target.size,
                direction: target.direction,
                draggable: target.draggable,
                rotationStyle: target.rotationStyle
            };

            for (const variable in target.variables) {
                newTarget.variables[variable] = [target.variables[variable].name, target.variables[variable].value];
            }

            for (const list in target.lists) {
                newTarget.lists[list] = [target.lists[list].name, target.lists[list].value];
            }

            for (const broadcast in target.broadcasts) {
                newTarget.broadcasts[broadcast] = target.broadcasts[broadcast];
            }

            for (const customVar in target.customVars) {
                newTarget.customVars.push(target.customVars[customVar]);
            }

            for (const block in target.blocks) {
                if (target.blocks[block].is_variable_reporter) {
                    newTarget.blocks[block] = [
                        target.blocks[block].varReporterBlock.first_num,
                        target.blocks[block].varReporterBlock.name,
                        target.blocks[block].varReporterBlock.id,
                        target.blocks[block].varReporterBlock.second_num,
                        target.blocks[block].varReporterBlock.third_num,
                    ]
                    continue;
                }

                newTarget.blocks[block] = {
                    opcode: target.blocks[block].opcode,
                    next: target.blocks[block].next || null,
                    parent: target.blocks[block].parent || null,
                    inputs: {},
                    fields: {},
                    shadow: target.blocks[block].shadow,
                    topLevel: target.blocks[block].topLevel,
                    x: target.blocks[block].x,
                    y: target.blocks[block].y,
                }

                if (target.blocks[block].mutation) {
                    newTarget.blocks[block].mutation = {
                        tagName: target.blocks[block].mutation.tagName,
                        proccode: target.blocks[block].mutation.proccode,
                        argumentids: target.blocks[block].mutation.argumentids,
                        argumentnames: target.blocks[block].mutation.argumentnames,
                        argumentdefaults: target.blocks[block].mutation.argumentdefaults,
                        warp: target.blocks[block].mutation.warp,
                        returns: target.blocks[block].mutation._returns,
                        edited: target.blocks[block].mutation.edited,
                        optype: target.blocks[block].mutation.optype,
                        color: target.blocks[block].mutation.color,
                        children: []
                    }
                }

                for (const input in target.blocks[block].inputs) {
                    newTarget.blocks[block].inputs[input] = JSON.parse(target.blocks[block].inputs[input]);
                }

                for (const field in target.blocks[block].fields) {
                    newTarget.blocks[block].fields[field] = JSON.parse(target.blocks[block].fields[field]);
                }
            }

            for (const comment in target.comments) {
                newTarget.comments[comment] = target.comments[comment];
            }

            for (const costume in target.costumes) {
                newTarget.costumes[costume] = target.costumes[costume];
            }

            for (const sound in target.sounds) {
                newTarget.sounds[sound] = target.sounds[sound];
            }

            newJson.targets.push(newTarget);
        }

        for (const monitor in json.monitors) {
            let newMonitor = {
                id: json.monitors[monitor].id,
                mode: json.monitors[monitor].mode,
                opcode: json.monitors[monitor].opcode,
                params: json.monitors[monitor].params,
                spriteName: json.monitors[monitor].spriteName || "",
                value: json.monitors[monitor].value,
                width: json.monitors[monitor].width,
                height: json.monitors[monitor].height,
                x: json.monitors[monitor].x,
                y: json.monitors[monitor].y,
                visible: json.monitors[monitor].visible,
                sliderMin: json.monitors[monitor].sliderMin,
                sliderMax: json.monitors[monitor].sliderMax,
                isDiscrete: json.monitors[monitor].isDiscrete
            }

            for (const param in json.monitors[monitor].params) {
                newMonitor.params[param] = json.monitors[monitor].params[param];
            }

            newJson.monitors.push(newMonitor);
        }

        for (const extensionData in json.antiSigmaExtensionData) {
            // "legacy" stuff
            newJson.extensionData[extensionData] = json.extensionData[extensionData].data;
        }

        for (const extensionData in json.extensionData) {
            if (json.extensionData[extensionData].parse) {
                newJson.extensionData[extensionData] = JSON.parse(json.extensionData[extensionData].data);
            } else {
                newJson.extensionData[extensionData] = json.extensionData[extensionData].data;
            }
        }

        for (const extensionURL in json.extensionURLs) {
            newJson.extensionURLs[extensionURL] = json.extensionURLs[extensionURL];
        }

        return newJson;
    }
    
    /**
     * Cast a value to a string
     * @param {any} value The value to cast 
     * @returns {string} The value as a string
     */
    castToString(value) {
        if (typeof value !== "object") {
            return String(value);
        }

        return JSON.stringify(value);
    }

    /**
     * Set the legal extensions
     * @param {Array<string>} extensions Array of extension IDs to set the legal list to
     */
    async setLegalExtensions(extensions) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$set: {items: extensions}});
    }

    /**
     * Add an extension to the legal list
     * @param {string} extension Extension ID
     */
    async addLegalExlegalExtentension(extension) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$push: {items: extension}});
    }

    /**
     * Remove an extension from the legal list
     * @param {string} extension Extension ID
     */
    async removeLegalExtension(extension) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$pull: {items: extension}});
    }

    async getLegalExtensions() {
        const result = await this.illegalList.findOne({id: "legalExtensions"});

        return result.items;
    }

    /**
     * Check if an extension is allowed
     * @param {string} extension The extension to check
     * @returns {Promise<boolean>} True if the extension is allowed, false if not
     */
    async checkExtensionIsAllowed(extension) {
        if (!extension) return true;

        const extensionsConfig = await this.illegalList.findOne({id: "legalExtensions"});
        const isIncluded = extensionsConfig.items.includes(extension);

        return isIncluded;
    };
    async validateAreProjectExtensionsAllowed(extensions, extensionURLs, username) {
        const isAdmin = await this.isAdmin(username);
        const isModerator = await this.isModerator(username);

        // Note, this does make the above function useless. Not sure if there's any need to keep it yet.
        const extensionsConfig = await this.illegalList.findOne({id: "legalExtensions"});

        // check the extensions
        const userRank = await this.getRank(username);
        if (userRank < 1 && !isAdmin && !isModerator) {
            const isUrlExtension = (extId) => {
                if (!extensionURLs) return false;
                return (extId in extensionURLs);
            };

            if (extensions && !isAdmin && !isModerator) {
                for (let extension of extensions) {
                    if (isUrlExtension(extension)) { // url extension names can be faked (if not trusted source)
                        let found = false;
                        for (let source of extensionsConfig.items) {
                            // http and localhost urls shouldnt be allowed anyway, and :// means no extension ID should ever collide with this
                            if (!source.startsWith("https://")) continue;
                            // Still using startsWith since it allows for an entire URL to be whitelisted if neccessary.
                            if (extensionURLs[extension].startsWith(source)) {
                                found = true;
                            }
                        }
                        if (!found) {
                            return [false, extension];
                        } else {
                            continue;
                        }
                    }
                    
                    if (!extensionsConfig.items.includes(extension)) {
                        return [false, extension];
                    }
                }
            }
        }

        return [true];
    }

    /**
     * Make a token for a user
     * @param {string} username Username of the user to make the token for
     * @returns {Promise<string>} the new token
     */
    async newTokenGen(username) {
        const token = randomBytes(32).toString("hex");

        await this.users.updateOne({ username: username }, { $set: { token: token, lastLogin: Date.now() } });

        return token;
    }

    /**
     * Search project names/instructions/notes by query
     * @param {boolean} show_unranked Show unranked users
     * @param {string} query Query to search for
     * @param {number} page Page of projects to get 
     * @param {number} pageSize Amount of projects to get 
     * @returns {Promise<Array<object>>} Array of projects
     */
    async searchProjects(show_unranked, query, type, page, pageSize) {
        let aggregateList = [
            {
                $match: { softRejected: false, hardReject: false, public: true }
            },  
        ];

        function escapeRegex(input) {
            return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        aggregateList.push(
            {
                $match: { $or: [
                    { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                    { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                    { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                ] },
            }
        );

        switch (type) {
            case "featured":
                aggregateList.push({
                    $match: { featured: true }
                },
                {
                    $match: { $or: [
                        { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                    ] },
                },
                {
                    $sort: { date: -1 }
                });
                break;
            case "newest":
                aggregateList.push({
                    $match: { $or: [
                        { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                    ] },
                },
                {
                    $sort: { lastUpdate: -1 }
                });
                break;
            default:
            case "views":
                aggregateList.push({
                    $sort: { views: -1 }
                }, {
                    $match: { $or: [
                        { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                        { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                    ] },
                });
                break;
            case "loves":
                // collect likes
                aggregateList.push(
                    {
                        $match: { $or: [
                            { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                            { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                            { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                        ] },
                    },
                    {
                        $lookup: {
                            from: "projectStats",
                            localField: "id",
                            foreignField: "projectId",
                            as: "projectStatsData"
                        }
                    },
                    {
                        $addFields: {
                            loves: {
                                $size: {
                                    $filter: {
                                        input: "$projectStatsData",
                                        as: "stat",
                                        cond: { $eq: ["$$stat.type", "love"] }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $sort: { loves: -1 }
                    }
                );
                break;
            case "votes":
                aggregateList.push(
                    {
                        $match: { $or: [
                            { title: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                            { instructions: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } },
                            { notes: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
                        ] },
                    },
                    {
                        $lookup: {
                            from: "projectStats",
                            localField: "id",
                            foreignField: "projectId",
                            as: "projectStatsData"
                        }
                    },
                    {
                        $addFields: {
                            loves: {
                                $size: {
                                    $filter: {
                                        input: "$projectStatsData",
                                        as: "stat",
                                        cond: { $eq: ["$$stat.type", "love"] }
                                    }
                                }
                            }
                        }
                    },
                    {
                        $sort: { loves: -1 }
                    }
                );
                break;
        }

        if (!show_unranked) {
            aggregateList.push(
                { // get user input
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo"
                    }
                },
                { // only allow ranked users to show up
                    $match: { "authorInfo.rank": { $gt: 0 } }
                },
            );
        }

        aggregateList.push(
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
        )

        if (show_unranked) {
            aggregateList.push(
                { // get user input
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo"
                    }
                },
            );
        }
        
        aggregateList.push(
            {
                // set author to { id: old_.author, username: authorInfo.username }
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "projectStatsData",
                    "_id",
                    "authorInfo",              
                ]
            }
        );

        const result = await this.projects.aggregate(aggregateList)
        .toArray();

        /*
        const final = [];
        for (const project of result[0].data) {
            delete project._id;
            project.author = {
                id: project.author,
                username: await this.getUsernameByID(project.author)
            }

            if (project.projectStatsData) {
                delete project.projectStatsData;
            }

            final.push(project);
        }
            */

        return result;
    }

    /**
     * Search users by a query
     * @param {string} query Query to search for
     * @param {number} page Page of projects to get 
     * @param {number} pageSize Amount of projects to get 
     * @returns {Promise<Array<object>>} Array of users
     */
    async searchUsers(query, page, pageSize) {
        function escapeRegex(input) {
            return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }

        const result = await this.users.aggregate([
            {
                $match: { permBanned: false, username: { $regex: `.*${escapeRegex(query)}.*`, $options: "i" } }
            },
            {
                $sort: { followers: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            // turn all the data into just {username, id}
            {
                $project: {
                    username: true,
                    id: true,
                },
            }
        ])
        .toArray();

        /*
        const cleaned = result[0].data.map(x => {let v = x;delete v._id;return v;})

        const final = cleaned.map((user) => ({username: user.username, id: user.id}))
        */

        return result;
    }

    /**
     * Specialized search for a query, like { author: abc } or another metadata item, (you can also use cool mongodb stuff!!)
     * @param {Array<Object>} query Query to search for, will be expanded with ...
     * @param {number} page Page of projects to get
     * @param {number} pageSize Amount of projects to get
     * @returns {Array<Object>} Array of projects
     */
    async specializedSearch(query, page, pageSize, maxPageSize) {
        let pipeline = [
            {
                $sort: { lastUpdate: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: maxPageSize,
            },
            ...query,
            {
                $limit: pageSize
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo"
                }
            },
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "authorInfo",
                    "_id"
                ]
            }
        ];

        const aggResult = await this.projects.aggregate(pipeline)
        .toArray();

        /*
        const final = []
        for (const project of aggResult[0].data) {
            delete project._id;
            project.author = {
                id: project.author,
                username: project.authorInfo[0].username
            }
            delete project.authorInfo; // dont send sensitive info
            final.push(project);
        }
            */

        return aggResult;
    }

    async almostFeatured(page, pageSize, featureAmount) {
        const result = this.projectStats.aggregate([
            {
                $match: { type: "vote" }
            },
            {
                $group: {
                    _id: "$projectId",
                    count: { 
                        $count: {}
                    },
                    earliest: { $min: "$_id" } // we dont track the date so just use the id (mongo id is a timestamp)
                }
            },
            {
                $match: {
                    count: { $gte: Math.ceil(featureAmount / 3 * 2) }
                }
            },
            {
                $match: {
                    count: { $lt: featureAmount }
                }
            },
            {
                $sort: { earliest: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $sort: { count: -1 }
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "_id",
                    foreignField: "id",
                    as: "projectData"
                }
            },
            {
                $addFields: {
                    "projectData": { $arrayElemAt: ["$projectData", 0] }
                }
            },
            {
                $match: {
                    projectData: { $exists: true }
                }
            },
            {
                $replaceRoot: { newRoot: "$projectData" }
            },
            {
                $match: { 
                    featured: false, 
                    softRejected: false, 
                    public: true, 
                    hardReject: false 
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo"
                }
            },
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "authorInfo",
                    "_id",
                ]
            }
        ])
        .toArray();

        return result;
    }

    async mostLiked(page, pageSize, likedAmount) {
        const result = this.projectStats.aggregate([
            {
                $match: { type: "love" }
            },
            {
                $group: {
                    _id: "$projectId",
                    count: {
                        $count: {}
                    },
                    earliest: { $min: "$_id" } // we dont track the date so just use the id (mongo id is a timestamp)
                }
            },
            {
                $match: {
                    count: { $gte: likedAmount }
                }
            },
            {
                $sort: { earliest: -1 }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $sort: { count: -1 }
            },
            {
                $lookup: {
                    from: "projects",
                    localField: "_id",
                    foreignField: "id",
                    as: "projectData"
                }
            },
            {
                $addFields: {
                    "projectData": { $arrayElemAt: ["$projectData", 0] }
                }
            },
            {
                $match: {
                    projectData: { $exists: true }
                }
            },
            {
                $replaceRoot: { newRoot: "$projectData" }
            },
            {
                $match: { 
                    featured: false, 
                    softRejected: false, 
                    public: true, 
                    hardReject: false 
                }
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo"
                }
            },
            {
                $addFields: {
                    "author": {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] }
                    }
                }
            },
            {
                $unset: [
                    "authorInfo",
                    "_id",
                ]
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Set a project to soft rejected
     * @param {string} id ID of the project
     * @param {boolean} toggle True if soft rejecting, false if undoing it
     */
    async softReject(id, toggle) {
        // dont change if public as you should still be able to go to it if you have the id
        await this.projects.updateOne({id: id}, { $set: { softRejected: toggle } });
    }

    /**
     * Check if a project is soft rejected
     * @param {string} id ID of the project
     * @returns {Promise<boolean>}
     */
    async isSoftRejected(id) {
        const result = await this.projects.findOne({id: id});

        return result.softRejected;
    }

    /**
     * Set a project to private/not private
     * @param {string} id ID of the project
     * @param {boolean} toggle True if making private, false if not
     */
    async privateProject(id, toggle) {
        await this.projects.updateOne({id: id}, { $set: { public: !toggle } });
    }

    async getAllFollowing(id, page, pageSize) {
        const result = await this.followers.aggregate([
            {
                $match: { follower: id, active: true }
            },
            {
                $skip: page * pageSize
            },
            {
                $limit: pageSize
            },
            {
                $lookup: {
                    from: "users",
                    localField: "target",
                    foreignField: "id",
                    as: "userInfo"
                },
            },
            {
                $addFields: {
                    username: { $arrayElemAt: ["$userInfo.username", 0] },
                    // target
                    id: "$target"
                }
            },
            {
                $project: {
                    username: true,
                    id: true,
                    _id: false,
                }
            }
        ])
        .toArray();

        return result;
    }

    /**
     * Get a users feed
     * @param {string} username Username of the user
     * @param {number} size Size of the feed 
     * @returns {Promise<ARray<Object>>}
     */
    async getUserFeed(username, size) {
        const id = await this.getIDByUsername(username);
        const followers = await this.getAllFollowing(id, 0, Number(process.env.MaxPageSize || 0));

        const feed = await this.userFeed.aggregate([
            {
                $match: { userID: { $in: followers.map(x => x.id) } }//, expireAt: { $gt: Date.now() } }
            },
            {
                $sort: { date: -1 }
            },
            {
                $limit: size
            },
            {
                $lookup: {
                    from: "users",
                    localField: "userID",
                    foreignField: "id",
                    as: "userInfo"
                }
            },
            {
                $addFields: {
                    username: { $arrayElemAt: ["$userInfo.username", 0] },
                    id: "$userID"
                },
            },
            {
                $unset: ["_id", "userInfo", "userID"]
            }
        ])
        .toArray();

        return feed;
    }

    /**
     * 
     * @param {string} userID ID of the user
     * @param {string} type Type of the feed item
     * @param {string} data Data of the feed item, for example the project id
     */
    async addToFeed(userID, type, data) {
        await this.userFeed.insertOne({
            userID: userID,
            type: type,
            data: data,
            date: Date.now(),
            expireAt: Date.now() + Number(process.env.FeedExpirationTime)
        });
    }

    /**
     * Set a users pfp
     * @param {string} username Username of the user
     * @param {Buffer} buffer Buffer of the pfp
     */
    async setProfilePicture(username, buffer) {
        const id = await this.getIDByUsername(username);

        await this.minioClient.putObject("profile-pictures", id, buffer);
    }

    /**
     * Get a user's profile picture
     * @param {string} username Username of the user
     * @returns {Promise<Buffer>} User's pfp
     */
    async getProfilePicture(username) {
        const id = await this.getIDByUsername(username);

        const buffer = await this.readObjectFromBucket("profile-pictures", id);

        return buffer;
    }
    
    /**
     * Set a user's birthday and or country
     * @param {string} username Username of the user
     * @param {string?} birthday birth date of the user formatted as an ISO string "1990-01-01T00:00:00.000Z", if provided
     * @param {string?} country country code if the user as defined by ISO 3166-1 Alpha-2, if provided
     */
    async setUserBirthdayAndOrCountry(username, birthday, country) {
        if (!birthday && !country) {
            console.log("neither birthday nor country entered");
            return;
        }
        const updateObj = {};
        if (birthday) {
            updateObj.birthday = birthday;
            updateObj.birthdayEntered = true;
        }
        if (country) {
            updateObj.country = country;
            updateObj.countryEntered = true;
        }
        await this.users.updateOne({ username: username }, { $set: updateObj });
    }

    async getStats() {
        const userCount = await this.users.countDocuments({ permBanned: false }); // dont count perm banned users :tongue:
        const bannedCount = await this.users.countDocuments({ $or: [{ permBanned: true }, { unbanTime: { $gt: Date.now() } }] });
        const projectCount = await this.projects.countDocuments();
        // check if remix is not 0
        const remixCount = await this.projects.countDocuments({ remix: { $ne: "0" } });
        const featuredCount = await this.projects.countDocuments({ featured: true });

        const mongodb_stats = await this.db.command(
            {
              serverStatus: 1
            }
        );

        return {
            userCount: userCount,
            bannedCount: bannedCount,
            projectCount: projectCount,
            remixCount: remixCount,
            featuredCount: featuredCount,
            mongodb_stats: mongodb_stats
        }
    }

    async markPrivacyPolicyAsRead(username) {
        await this.users.updateOne({ username: username }, { $set: { lastPrivacyPolicyRead: Date.now() } });
    }

    async markTOSAsRead(username) {
        await this.users.updateOne({ username: username }, { $set: { lastTOSRead: Date.now() } });
    }

    async markGuidelinesAsRead(username) {
        await this.users.updateOne({ username: username }, { $set: { lastGuidelinesRead: Date.now() } });
    }

    async getLastPolicyRead(username) {
        const result = await this.users.findOne({ username: username });

        return {
            privacyPolicy: result.lastPrivacyPolicyRead,
            TOS: result.lastTOSRead,
            guidelines: result.lastGuidelinesRead
        }
    }

    async getLastPolicyUpdate() {
        const out = {};

        (await this.lastPolicyUpdates.find().toArray())
        .map(x => {
            out[x.id] = x.lastUpdate;
        });

        return out;
    }

    async setLastPrivacyPolicyUpdate() {
        await this.lastPolicyUpdates.updateOne({ id: "privacyPolicy" }, { $set: { lastUpdate: Date.now() } });
    }

    async setLastTOSUpdate() {
        await this.lastPolicyUpdates.updateOne({ id: "TOS" }, { $set: { lastUpdate: Date.now() } });
    }

    async setLastGuidelinesUpdate() {
        await this.lastPolicyUpdates.updateOne({ id: "guidelines" }, { $set: { lastUpdate: Date.now() } });
    }

    async getRuntimeConfigItem(id) {
        const result = await this.runtimeConfig.findOne({ id: id });

        return result.value;
    }

    async setRuntimeConfigItem(id, value) {
        await this.runtimeConfig.updateOne({ id: id }, { $set: { value: value } });
    }

    async isPrivateProfile(username) {
        const result = await this.users.findOne({ username: username });

        return result.privateProfile;
    }

    async setPrivateProfile(username, toggle) {
        await this.users.updateOne({ username: username }, { $set: { privateProfile: toggle } });
    }

    async canFollowingSeeProfile(username) {
        const result = await this.users.findOne({ username: username });

        return result.allowFollowingView;
    }

    async setFollowingSeeProfile(username, toggle) {
        await this.users.updateOne({ username: username }, { $set: { allowFollowingView: toggle } });
    }

    /**
     * Temporarily ban a user
     * @param {string} username Username of the user
     * @param {string} reason Reason for temp ban
     * @param {number} length Length of ban in milliseconds
     * @returns {Promise<void>}
     */
    async tempBanUser(username, reason, length) {
        await this.users.updateOne({ username: username }, { $set: { banReason: reason, unbanTime: Date.now()+length } });
    }

    async unTempBan(username) {
        await this.users.updateOne({ username: username }, { $set: { unbanTime: 0 } });
    }

    async getBanReason(username) {
        const result = await this.users.findOne({ username: username });

        return result.banReason;
    }

    async isTempBanned(username) {
        const result = await this.users.findOne({ username: username });

        return result.unbanTime > Date.now();
    }

    async getStanding(username) {
        const result = await this.users.findOne({ username: username });

        if (result.unbanTime > Date.now()) return 2;
        if (result.permBanned) return 3;
        // ATODO: 2 is limited, not yet implemented
        return 0;
    }

    async hasLoggedInWithIP(username, ip) {
        const id = await this.getIDByUsername(username);

        const result = await this.loggedIPs.findOne({ id: id, ip: ip });

        return result ? true : false;
    }

    /**
     * 
     * @param {string} username Username of the user
     * @param {string} ip Ip they logged in with
     * @returns {Promise<boolean>} Whether or not its new
     */
    async addIP(username, ip) {
        const id = await this.getIDByUsername(username);

        if (await this.loggedIPs.findOne({ id: id, ip: ip })) {
            await this.loggedIPs.updateOne({ id: id, ip: ip }, { $set: { lastLogin: Date.now() } });
            return true;
        }

        await this.loggedIPs.insertOne({
            id: id,
            ip: ip,
            lastLogin: Date.now(),
            banned: false,
        });

        return false;
    }

    async getIPs(username) {
        const id = await this.getIDByUsername(username);

        const ips = (await this.loggedIPs.find({ id: id }).toArray())
        .map(x => {
            return {
                ip: x.ip,
                banned: x.banned,
                lastLogin: x.lastLogin
            }
        });

        return ips;
    }

    async isIPBanned(ip) {
        const result = await this.loggedIPs.findOne({ ip: ip });

        if (!result) return false;

        return result.banned;
    }

    async banIP(ip, toggle) {
        await this.loggedIPs.updateMany({ ip: ip }, { $set: { banned: toggle } });

        if (toggle) {
            // ban all accounts with this ip
            const accounts = await this.loggedIPs.find({ ip: ip }).toArray();
            for (const account of accounts) {
                await this.setPermBanned(await this.getUsernameByID(account.id), true, "IP banned", true);
            }
        }
    }

    async banUserIP(username, toggle) {
        const id = await this.getIDByUsername(username);

        await this.loggedIPs.updateMany({ id: id }, { $set: { banned: toggle } });

        if (toggle) {
            // ban all accounts with the same ip
            const ips = await this.getIPs(username);

            for (const ip of ips) {
                // find all accounts with this ip
                const accounts = await this.loggedIPs.find({ ip: ip.ip }).toArray();
                
                for (const account of accounts) {
                    await this.setPermBanned(await this.getUsernameByID(account.id), true, "IP banned", true);
                }
            }
        }
    }

    async getAllAccountsWithIP(ip) {
        const result = await this.loggedIPs.find({ ip: ip }).toArray();
        //.map(x => ({id: x.id, username: await this.getUsernameByID(x.id)}));

        const final = [];
        for (const account of result) {
            final.push({
                id: account.id,
                username: await this.getUsernameByID(account.id)
            });
        }

        return final;
    }

    async setEmail(username, email) {
        if (await this.emailInUse(email)) return;

        await this.users.updateOne({ username: username }, { $set: { email: email } });
    }

    async isEmailVerified(username) {
        const result = await this.users.findOne({ username: username });

        return result.emailVerified;
    }

    async setEmailVerified(username, toggle) {
        await this.users.updateOne({ username: username }, { $set: { emailVerified: toggle } });
    }

    async emailInUse(email) {
        const result = await this.users.findOne({ email: email });

        return result ? true : false;
    }

    async getUsernameByEmail(email) {
        const result = await this.users.findOne({ email: email });

        if (!result) return false;

        return result.username;
    }

    /**
     * Get the ID of a user by their email
     * @param {string} email Email of the user
     * @returns {Promise<string>}  The ID of the user
     */
    async getIDByEmail(email) {
        const result = await this.users.findOne({ email: email });

        return result.id;
    }

    async getEmailCount() {
        const result = await this.sentEmails.countDocuments({expireAt: { $gt: Date.now() }});

        return result;
    }

    /**
     * Send an email
     * @param {string} userid ID of who you're sending it to
     * @param {string} userip IP of who you're sending it to (ipv6)
     * @param {string} email Email of who you're sending it to
     * @param {string} subject Subject of the email
     * @param {string} message Message of the email
     * @param {string} messageHtml Message of the email but html (use this as primary)
     * @returns {Promise<boolean>} Success or not
     */
    async sendEmail(userid, userip, type, email, name, subject, message, messageHtml) {
        if (await this.getEmailCount() > process.env.EmailLimit) return false;

        await this.sentEmails.insertOne({
            userid,
            userip,
            sentAt: Date.now(),
            expireAt: new Date(),
            type
        });

        /*/
         * Send email
         * with node-mailjet
         * if it fails return false
        /*/

        const mailjet = new Mailjet({
            apiKey: process.env.MJApiKeyPublic,
            apiSecret: process.env.MJApiKeyPrivate
        });

        try {
            await mailjet.post('send', { version: 'v3.1' })
            .request({
                Messages: [
                    {
                        "From": {
                        "Email": "no-reply@penguinmod.com",
                        "Name": "Penguinmod"
                        },
                        "To": [
                        {
                            "Email": email,
                            "Name": name
                        }
                        ],
                        "Subject": subject,
                        "TextPart": message,
                        "HTMLPart": messageHtml,
                    }
                ]
            })
        } catch (e) {
            console.log("mail error", e);
            return false;
        }

        return true;
    }

    async lastEmailSentByID(userid) {
        const result = (await this.sentEmails.aggregate([{
            $match: { userid }
        },
        {
            $sort: { sentAt: -1 }
        },
        {
            $limit: 1
        }]).toArray())[0];

        if (!result) return 0;

        return result.sentAt;
    }

    async lastEmailSentByIP(userip) {
        const result = (await this.sentEmails.aggregate([{
            $match: { userip }
        },
        {
            $sort: { sentAt: -1 }
        },
        {
            $limit: 1
        }]).toArray())[0];

        if (!result) return 0;

        return result.sentAt;
    }

    async generatePasswordResetState(email) {
        const state = randomBytes(32).toString("hex");

        await this.passwordResetStates.insertOne({
            state: state,
            email: email,
            expireAt: Date.now() + 1000 * 60 * 60 * 2
        });

        return state;
    }

    async verifyPasswordResetState(state, email) {
        const result = await this.passwordResetStates.findOne({ state: state, email: email });

        // now get rid of the state cuz uh we dont need it anymore

        if (!!result)
            await this.passwordResetStates.deleteOne({ state: state })

        return !!result ? true : false;
    }

    async getUserCustomization(username) {
        const result = await this.accountCustomization.findOne({ username: username });

        return result.text;
    }

    async setUserCustomization(username, text) {
        await this.accountCustomization.updateOne({ username: username }, { $set: { text: text } });
    }

    async clearAllEmails() {
        await this.sentEmails.deleteMany({});
    }

    async massBanByUsername(regex, toggle, reason="Banned by staff") {
        const users = await this.users.find({ username: { $regex: regex } }).toArray();
        const count = users.length;

        for (const user of users) {
            await this.setPermBanned(user.username, toggle, reason, true);
        }

        return count;
    }

    async verifyFollowers(username) {
        // what this means: go through the followers. if they are banned, remove them.
        const id = await this.getIDByUsername(username);

        const followers = await this.followers.find({ target: id }).toArray();

        for (const follower of followers) {
            const user = await this.users.findOne({ id: follower.follower });

            if (user.permBanned) {
                await this.followers.updateOne({ follower: follower.follower, target: id }, { $set: { active: false } });
            }
        }

        // count the amount of followers
        const count = await this.followers.countDocuments({ target: id, active: true });

        await this.users.updateOne({ id: id }, { $set: { followers: count } });
    }
}

module.exports = UserManager;
