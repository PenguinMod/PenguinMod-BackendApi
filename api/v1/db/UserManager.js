require('dotenv').config();
const { randomInt, randomBytes } = require('node:crypto');
const bcrypt = require('bcrypt');
const { MongoClient } = require('mongodb');
const ULID = require('ulid');
const Minio = require('minio');
const protobuf = require('protobufjs');
var prompt = require('prompt-sync')();

// scratch oauth redir: http://localhost:PORT/api/v1/users/loginlocal
//                      https://projects.penguinmod.com/api/v1/users/login

class UserManager {
    static loginInvalidationTime = 
    1000 *  // second
    60 * // minute
    60 * // hour
    24 * // day
    3; // 3 days

    /**
     * Initialize the database
     * @param {number} maxviews - maximum amount of views before the view counter resets
     * @param {number} viewresetrate - time in milliseconds before the view counter resets
     * @async
     */
    async init(maxviews, viewresetrate) {
        this.client = new MongoClient('mongodb://localhost:27017');
        await this.client.connect();
        this.db = this.client.db('pm_apidata');
        this.users = this.db.collection('users');
        this.oauthIDs = this.db.collection('oauthIDs');
        this.reports = this.db.collection('reports');
        this.projects = this.db.collection('projects');
        this.projectStats = this.db.collection('projectStats');
        this.messages = this.db.collection('messages');
        this.oauthStates = this.db.collection('oauthStates');
        this.illegalList = this.db.collection('illegalList');
        if (!this.illegalList.findOne({ id: "illegalWords" })) {
            this.illegalList.insertMany([
                { id: "illegalWords", items: [] },
                { id: "illegalWebsites", items: [] },
                { id: "spacedOutWordsOnly", items: [] },
                { id: "potentiallyUnsafeWords", items: [] },
                { id: "potentiallyUnsafeWordsSpacedOut", items: [] },
                { id: "legalExtensions", items: []}
            ]);
        }
        this.prevReset = Date.now();
        this.views = [];

        this.maxviews = maxviews ? maxviews : 10000;
        this.viewresetrate = viewresetrate ? viewresetrate : 1000 * 60 * 60;

        // Setup minio

        this.minioClient = new Minio.Client({
            endPoint: 'localhost',
            port: 9000,
            useSSL: false,
            accessKey: process.env.MinioClientID,
            secretKey: process.env.MinioClientSecret
        });
        // project bucket
        this._makeBucket("projects");
        // project thumbnail bucket
        this._makeBucket("project-thumbnails");
        // project asset bucket
        this._makeBucket("project-assets");
    }

    async _makeBucket(bucketName) {
        this.minioClient.bucketExists(bucketName, (err, exists) => {
            if (err) {
                console.log("Error checking if bucket exists:", err);
                return;
            }
            if (!exists) {
                this.minioClient.makeBucket(bucketName, (err) => {
                    if (err) {
                        console.log("Error making bucket:", err);
                        return;
                    }
                });
            }
        });
    }

    /**
     * Reset a minio bucket
     * @param {string} bucketName - Name of the bucket
     * @async
     */
    async resetBucket(bucketName) {
        this.deleteMultipleObjects(bucketName, "");
    }

    /**
     * Reset the database
     * @param {boolean} understands - skip the prompt if true
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
        await this.oauthIDs.deleteMany({});
        await this.reports.deleteMany({});
        await this.projects.deleteMany({});
        await this.projectStats.deleteMany({});
        await this.messages.deleteMany({});
        await this.oauthStates.deleteMany({});
        await this.illegalList.deleteMany({});
        await this.illegalList.insertMany([
            { id: "illegalWords", items: [] },
            { id: "illegalWebsites", items: [] },
            { id: "spacedOutWordsOnly", items: [] },
            { id: "potentiallyUnsafeWords", items: [] },
            { id: "potentiallyUnsafeWordsSpacedOut", items: [] },
            { id: "legalExtensions", items: []}
        ]);

        // reset minio buckets
        await this.resetBucket("projects");
        await this.resetBucket("project-thumbnails");
        await this.resetBucket("project-assets");
    }

    /**
     * Create an account
     * @param {string} username - new username of the user
     * @param {string} password - new password of the user
     * @param {string|undefined} email - email of the user, if provided
     * @returns {Promise<string|boolean>} - token if successful, false if not
     * @async
     */
    async createAccount(username, password, email) {
        const result = await this.users.findOne({ username: username });
        if (result) {
            return false;
        }

        const hash = await bcrypt.hash(password, 10);
        const id = ULID.ulid();
        const token = ULID.ulid();
        await this.users.insertOne({
            id: id,
            username: username,
            password: hash,
            token: token,
            admin: false,
            moderator: false,
            banned: false,
            rank: 0,
            badges: [],
            following: [],
            followers: [],
            bio: "",
            favoriteProjectType: -1,
            favoriteProjectID: -1,
            cubes: 0,
            firstLogin: Date.now(),
            lastLogin: Date.now(),
            lastUpload: 0,
            email: email
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
            return await this.newTokenGen(username);
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
        if (result.token === token) {
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
     * Get a user's oauth login methods
     * @param {string} username - Username of the user
     * @returns {Promise<Array<string>>} - Array of the user's followers
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
     * @param {string} username - Username of the user
     * @param {string} method - Method to add
     */
    async addOAuthMethod(username, method, code) {
        const id = await this.getIDByUsername(username);

        await this.oauthIDs.insertOne({ id: id, method: method, code: code })
    }

    /**
     * Remove an oauth login method from a user
     * @param {string} username - Username of the user 
     * @param {string} method - Method to remove
     */
    async removeOAuthMethod(username, method) {
        const id = await this.getIDByUsername(username);

        await this.oauthIDs.deleteOne({ id: id, method: method });
    }

    /**
     * Get the ID of a user by their oauth ID
     * @param {string} method - The oauth method the id is from
     * @param {string} id - The id from the oauth service
     * @returns {Promise<string>} - The id of the user
     */
    async getUserIDByOAuthID(method, id) {
        const result = await this.oauthIDs.findOne({ method: method, code: id });

        return result.id;
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
     * Get the user's first login
     * @param {string} username - Username of the user
     * @returns {Promise<number>} - When the user first logged in - Unix time
     */
    async getFirstLogin(username) {
        const result = await this.users.findOne({ username: username });

        return result.firstLogin;
    }

    /**
     * Get the user's last login
     * @param {string} username - Username of the user
     * @returns {Promise<number>} - Last time the user logged in - Unix time
     * @async
     */
    async getLastLogin(username) {
        const result = await this.users.findOne({ username: username });

        return result.lastLogin;
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
     * Get the rank of a user
     * @param {string} username - username of the user
     * @returns {Promise<number>} - rank of the user
     * @async
     */
    async getRank(username) {
        const result = await this.users.findOne({ username: username });

        return result.rank;
    }

    /**
     * Set the rank of a user
     * @param {string} username - username of the user
     * @param {number} rank - new rank of the user
     * @async
     */
    async setRank(username, rank) {
        await this.users.updateOne({ username: username }, { $set: { rank: rank } });
    }

    /**
     * Get the last upload time of a user
     * @param {string} username - username of the user
     * @returns {Promise<number>} - time of the last upload
     * @async
     */
    async getLastUpload(username) {
        const result = await this.users.findOne({ username: username });

        return result.lastUpload;
    }

    /**
     * Set the last upload time of a user
     * @param {string} username - username of the user
     * @param {number} lastUpload - time of the last upload
     * @async
     */
    async setLastUpload(username, lastUpload) {
        await this.users.updateOne({ username: username }, { $set: { lastUpload: lastUpload } });
    }

    /**
     * Get the badges of a user
     * @param {string} username - username of the user 
     * @returns {Promise<Array<string>>} - array of badges the user has
     * @async
     */
    async getBadges(username) {
        const result = await this.users.findOne({ username: username });

        return result.badges;
    }

    /**
     * Add a badge to a user
     * @param {string} username - username of the user 
     * @param {string} badge - the badge to add
     * @async
     */
    async addBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $push: { badges: badge } });
    }

    /**
     * Remove a badge from a user
     * @param {string} username - username of the user 
     * @param {string} badge - the badge to remove 
     * @async
     */
    async removeBadge(username, badge) {
        await this.users.updateOne({ username: username }, { $pull: { badges: badge } });
    }

    /**
     * Get a user's featured project
     * @param {string} username - Username of the user
     * @returns {Promise<number>} - ID of the user's favorite project
     */
    async getFeaturedProject(username) {
        const result = await this.users.findOne({ username: username });

        return result.myFeaturedProject;
    }

    /**
     * Set a user's featured project
     * @param {string} username - Username of the user 
     * @param {number} id - ID of the project
     * @async
     */
    async setFeaturedProject(username, id) {
        await this.users.updateOne({
            username: username
        }, {
            $set: { myFeaturedProject: id }
        });
    }

    /**
     * Get a user's featured project title
     * @param {string} username - Username of the user
     * @returns {Promise<number>} - Index of the title in the array of titles
     * @async
     */
    async getFeaturedProjectTitle(username) {
        const result = await this.users.findOne({ username: username });

        return result.myFeaturedProjectTitle;
    }

    /**
     * Set a user's featured project title
     * @param {string} username - Username of the user 
     * @param {number} title - Index of the title in the array of titles
     * @async
     */
    async setFeaturedProjectTitle(username, title) {
        await this.users.updateOne({
            username: username
        }, {
            $set: { myFeaturedProjectTitle: title }
        });
    }

    /**
     * Check if a user is an admin
     * @param {string} username 
     * @returns {Promise<boolean>} - true if the user is an admin, false if not
     * @async
     */
    async isAdmin(username) {
        const result = await this.users.findOne({ username: username });

        return result.admin;
    }

    /**
     * Set a user as an admin
     * @param {string} username - username of the user 
     * @param {boolean} admin - true if setting to admin, false if not 
     * @async
     */
    async setAdmin(username, admin) {
        await this.users.updateOne({ username: username }, { $set: { admin: admin } });
    }

    /**
     * Check if a user is a moderator
     * @param {string} username - username of the user
     * @returns {Promise<boolean>} - true if the user is a moderator, false if not
     * @async
     */
    async isModerator(username) {
        const result = await this.users.findOne({ username: username });

        return result.moderator;
    }

    /**
     * Set a user as a moderator
     * @param {string} username - username of the user
     * @param {boolean} moderator - true if setting to moderator, false if not
     * @async
     */
    async setModerator(username, moderator) {
        await this.users.updateOne({ username: username }, { $set: { moderator: moderator } });
    }

    /**
     * Get all admins
     * @returns {Promise<Array<object>>} - Array of all admins
     * @async
     */
    async getAllAdmins() {
        const result = await this.users.find({ admin: true }).toArray();

        return result;
    }

    /**
     * Get all moderators
     * @returns {Promise<Array<object>>} - Array of all moderators
     * @async
     */
    async getAllModerators() {
        const result = await this.users.find({ moderator: true }).toArray();

        return result;
    }

    /**
     * Check if a user is banned
     * @param {string} username - username of the user
     * @returns {Promise<boolean>} - true if the user is banned, false if not
     * @async
     */
    async isBanned(username) {
        const result = await this.users.findOne({ username: username });

        return result.banned;
    }

    /**
     * Ban/unban a user
     * @param {string} username - username of the user
     * @param {boolean} banned - true if banning, false if unbanning
     * @async
     */
    async setBanned(username, banned) {
        await this.users.updateOne({ username: username }, { $set: { banned: banned } });
    }

    /**
     * Get the email of a user
     * @param {string} username - username of the user
     * @returns {string} - email of the user
     * @async
     */
    async getEmail(username) {
        const result = await this.users.findOne({ username: username });

        return result.email;
    }

    /**
     * Set the email of a user
     * @param {string} username - username of the user
     * @param {string} email - email of the user
     * @async
     */
    async setEmail(username, email) {
        await this.users.updateOne({ username: username }, { $set: { email: email } });
    }

    /**
     * Logout a user
     * @param {string} username - username of the user
     * @async
     */
    async logout(username) {
        await this.users.updateOne({ username: username }, { $set: { lastLogin: 0 } }); // makes the token invalid
    }

    /**
     * Report something
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
            id: ULID.ulid()
        })
    }

    /**
     * Get reports by type
     * @param {number} type - The type of reports to get 
     * @returns {Promise<Array<object>>} - Array of reports of the specified type
     * @async
     */
    async getReportsByType(type) {
        const result = await this.reports.find({ type: type }).toArray();
        return result;
    }

    /**
     * Get reports by reportee
     * @param {string} reportee - ID of the person/project being reported
     * @returns {Promise<Array<object>>} - Array of reports on the specified reportee
     * @async
     */
    async getReportsByReportee(reportee) {
        const result = await this.reports.find({ reportee: reportee }).toArray();
        return result;
    }

    /**
     * Get reports by reporter
     * @param {string} reporter - ID of the person reporting
     * @returns {Promise<Array<object>>} - Array of reports by the specified reporter
     * @async 
     */
    async getReportsByReporter(reporter) {
        const result = await this.reports.find({ reporter: reporter }).toArray();
        return result;
    }

    /**
     * Get reports to a specified size
     * @param {number} page - page of reports to get
     * @param {number} pageSize - amount of reports to get
     * @returns {Promise<Array<object>>} - Reports in the specified amount
     * @async
     */
    async getReports(page, pageSize) {
        const result = await this.reports.aggregate([
            {
                $facet: {
                    metadata: [{ $count: "count" }],
                    data: [{ $skip: page * pageSize }, { $limit: pageSize }]
                }
            }
        ])
        .sort({ date: -1 })
        .toArray();

        return result;
    }

    /**
     * Delete a report
     * @param {string} id - ID of the report to delete
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
     * @param {number} remix ID of the project this is a remix of. Undefined if not a remix.
     * @param {string} rating Rating of the project.
     * @async
     */
    async publishProject(projectBuffer, assetBuffers, author, title, imageBuffer, instructions, notes, remix, rating) {
        let id;
        // TODO: replace this with a ulid somehow
        // i love being whimsical ^^
        do {
            id = randomInt(0, 9999999999).toString();
            id = "0".repeat(10 - id.length) + id;
        } while (await this.projects.findOne({id: id}));
        
        
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
            public: true
        });

        // minio bucket shit
        await this.minioClient.putObject("projects", id, projectBuffer);
        await this.minioClient.putObject("project-thumbnails", id, imageBuffer);
        for (const asset of assetBuffers) {
            await this.minioClient.putObject("project-assets", `${id}_${asset.id}`, asset.buffer);
        }
    }

    /**
     * Get remixes of a project
     * @param {number} id 
     * @returns {Promise<Array<Object>>} - Array of remixes of the specified project
     * @async
     */
    async getRemixes(id) {
        const result = await this.projects.find({remix: id, public: true}).toArray();

        return result;
    }

    /**
     * Update a project
     * @param {number} id - ID of the project 
     * @param {Buffer} projectBuffer - The file buffer for the project. This is a zip.
     * @param {string} title - Title of the project.
     * @param {Buffer} imageBuffer - The file buffer for the thumbnail.
     * @param {string} instructions - The instructions for the project.
     * @param {string} notes - The notes for the project 
     * @param {string} rating - Rating of the project. 
     * @async
     */
    async updateProject(id, projectBuffer, title, imageBuffer, instructions, notes, rating) {
        await this.projects.updateOne({id: id},
            {$set: {
                title: title,
                instructions: instructions,
                notes: notes,
                rating: rating,
                lastUpdate: Date.now()
            }}
        );

        // minio bucket shit
        await this.minioClient.putObject("projects", id, projectBuffer);
        await this.minioClient.putObject("project-thumbnails", id, imageBuffer);
    }

    /**
     * get projects to a specified size
     * @param {number} page - page of projects to get
     * @param {number} pageSize - amount of projects to get
     * @returns {Promise<Array<Object>>} - Projects in the specified amount
     * @async
     */
    async getProjects(page, pageSize) {
        const _result = await this.projects.aggregate([
            {
                $facet: {
                    metadata: [{ $count: "count" }],
                    data: [{ $skip: page * pageSize }, { $limit: pageSize }]
                }
            }
        ])
        .sort({ date: -1 })
        .toArray()

        const result = _result[0].data.map(x => {let v = x;delete v._id;return v;})

        return result;
    }

    /**
     * Get projects by a specified author
     * @param {string} author - ID of the author
     * @returns {Promise<Array<Object>>} - Array of projects by the specified author
     * @async
     */
    async getProjectsByAuthor(author) {
        const result = await this.projects.find({author: author}).toArray();

        return result;
    }

    /**
     * Read an object from a bucket
     * @param {string} bucketName - Name of the bucket
     * @param {string} objectName - Name of the object
     * @returns {Promise<Buffer>} - The object
     */
    async readObjectFromBucket(bucketName, objectName) {
        const stream = await this.minioClient.getObject(bucketName, objectName);

        const chunks = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", (err) => reject(err));
        });
    }

    /**
     * Get a project file
     * @param {number} id - ID of the project wanted.
     * @returns {Promise<Buffer>} - The project file.
     * @async
     */
    async getProjectFile(id) {
        const file = await this.readObjectFromBucket("projects", id);

        return file;
    }

    /**
     * Get a project image
     * @param {number} id - ID of the project image wanted. 
     * @returns {Promise<Buffer>} - The project image file.
     */
    async getProjectImage(id) {
        const file = await this.readObjectFromBucket("project-thumbnails", id);

        return file;
    }

    async deleteMultipleObjects(bucketName, prefix) {
        const stream = this.minioClient.listObjects(bucketName, prefix);

        const chunks = [];

        stream.on("data", (chunk) => chunks.push(chunk.name));
        stream.on("error", (err) => console.log("Error listing objects:", err));
        stream.on("end", () => {
            this.minioClient.removeObjects(bucketName, chunks, (err) => {
                if (err) {
                    console.log("Error removing objects:", err);
                }
            });
        });
    }

    async getProjectAssets(id) {
        const stream = await this.minioClient.listObjects("project-assets", id);

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
     * @param {number} id - ID of the project wanted.
     * @returns {Promise<Object>} - The project data.
     * @async
     */
    async getProjectMetadata(id) {
        if (!await this.projectExists(id)) return false;
        
        const tempresult = await this.projects.findOne({id: id})

        // add the views, loves, and votes
        const result = {
            ...tempresult,
            views: await this.getProjectViews(id),
            loves: await this.getProjectLoves(id),
            votes: await this.getProjectVotes(id)
        }

        return result;
    }

    /**
     * Check if a user has seen a project
     * @param {number} id - ID of the project. 
     * @param {string} ip - IP we are checking
     * @returns {Promise<boolean>} - True if they have seen the project, false if not. 
     * @async
     */
    async hasSeenProject(id, ip) {
        const result = this.views.find((view) => view.id === id && view.ip === ip);

        return result ? true : false;
    }

    /**
     * Add a view to a project
     * @param {number} id - ID of the project.
     * @param {string} ip - IP of the person seeing the project.
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
     * @param {number} id - ID of the project
     * @returns {number} - The number of views the project has
     */
    async getProjectViews(id) {
        const result = this.views.filter((view) => view.id === id);

        return result.length;
    }

    /**
     * Check if a user has loved a project
     * @param {number} id - ID of the project.
     * @param {string} userId - ID of the person loving the project.
     * @returns {Promise<boolean>} - True if they have loved the project, false if not.
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
     * @param {number} id - ID of the project.
     * @param {string} userId - ID of the person loving the project.
     * @param {boolean} love - True if loving, false if unloving.
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
     * @param {number} id - ID of the project
     * @returns {number} - Amount of loves the project has
     */
    async getProjectLoves(id) {
        const result = await this.projectStats.find({projectId: id, type: "love"}).toArray();

        return result.length;
    }

    /**
     * Check if a user has voted on a project
     * @param {number} id - ID of the project.
     * @param {string} userId - ID of the person voting on the project.
     * @returns {Promise<boolean>} - True if they have voted on the project, false if not.
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
     * @param {number} id - ID of the project.
     * @param {string} userId - ID of the person voting on the project.
     * @param {boolean} vote - True if voting, false if unvoting.
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
     * @param {number} id - ID of the project
     * @returns {number} - Amount of votes the project has
     * @async
     */
    async getProjectVotes(id) {
        const result = await this.projectStats.find({projectId: id, type: "vote"}).toArray();

        return result.length;
    }

    /**
     * Get a list of featured projects to a specified size
     * @param {number} page - page of projects to get
     * @param {number} pagesize - amount of projects to get
     * @returns {Promise<Array<Object>>} - Array of all projects
     * @async
     */
    async getFeaturedProjects(page, pagesize) {
        const result = await this.projects.aggregate([
            {
                $match: { featured: true }
            },
            {
                $facet: {
                    metadata: [{ $count: "count" }],
                    data: [{ $skip: page * pagesize }, { $limit: pagesize }]
                }
            }
        ])
        .sort({ date: -1 })
        .toArray();

        return result;
    }

    /**
     * Feature/unfeature a project
     * @param {number} id - ID of the project.
     * @param {boolean} feature - True if featuring, false if unfeaturing.
     * @async
     */
    async featureProject(id, feature) {
        await this.projects.updateOne({id: id}, {$set: {featured: feature}});
    }

    /**
     * Get the amount of projects
     * @returns {Promise<number>} - Amount of projects
     * @async
     */
    async getProjectCount() {
        const result = await this.projects.countDocuments();

        return result;
    }

    /**
     * delete a project
     * @param {number} id - ID of the project
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

    /**
     * Follow/unfollow a user
     * @param {string} follower - ID of the person following 
     * @param {string} followee - ID of the person being followed
     * @param {boolean} follow - True if following, false if unfollowing
     * @async
     */
    async followUser(follower, followee, follow) {
        if (follow) {
            await this.users.updateOne({id: follower}, {$push: {following: followee}});
            await this.users.updateOne({id: followee}, {$push: {followers: follower}});
            return;
        }
        await this.users.updateOne({id: follower}, {$pull: {following: followee}});
        await this.users.updateOne({id: followee}, {$pull: {followers: follower}});
    }

    /**
     * Check if a user is following another user
     * @param {string} follower - ID of the person following
     * @param {string} followee - ID of the person being followed
     * @returns {Promise<boolean>} - True if they are following, false if not
     * @async
     */
    async isFollowing(follower, followee) {
        const result = await this.users.findOne({id: followee});

        return result.followers.includes(follower);
    }

    /**
     * Get the people a person is being followed by
     * @param {string} username - username of the person
     * @returns {Promise<Array<string>>} - Array of the people the person is being followed by
     * @async
     */
    async getFollowers(username) {
        const result = await this.users.findOne({username: username});

        return result.followers;
    }

    /**
     * Get the people a person is following
     * @param {string} id - username of the person
     * @returns {Promise<Array<string>>} - Array of the people the person is following
     * @async
     */
    async getFollowing(username) {
        const result = await this.users.findOne({username: username});

        return result.following;
    }

    /**
     * Send a message
     * @param {string} sender - ID of the person sending the message
     * @param {string} receiver - ID of the person receiving the message
     * @param {string} message - The message - should follow the format specified in the schema
     * @async
     */
    async sendMessage(receiver, message) {
        await this.messages.insertOne({
            receiver: receiver,
            message: message,
            date: Date.now()
        });
    }

    /**
     * Get messages sent to a person
     * @param {string} receiver - ID of the person receiving the message
     * @returns {Promise<Array<Object>>} - Array of the messages sent to the person
     * @async
     */
    async getMessages(receiver) {
        const result = await this.messages.find({receiver: receiver}).toArray();

        return result;
    }

    /**
     * Get unread messages sent to a person
     * @param {string} receiver - ID of the person you're getting the messages from
     * @returns {Promise<Array<Object>>} - Array of the unread messages sent to the person
     * @async
     */
    async getUnreadMessages(receiver) {
        const result = await this.messages.find({receiver: receiver, read: false}).toArray();

        return result;
    }

    /**
     * Modify a message
     * @param {string} id - ID of the message
     * @param {function} modifierFunction - the function that modifies the message
     * @async
     */
    async modifyMessage(id, modifierFunction) {
        const result = await this.messages.findOne({id: id});

        await this.messages.updateOne({id: id}, modifierFunction(result));
    }

    /**
     * Delete a message
     * @param {string} id - ID of the message
     * @async
     */
    async deleteMessage(id) {
        await this.messages.deleteOne({id: id});
    }

    /**
     * Check if a project exists
     * @param {string} id - ID of the project
     * @returns {Promise<boolean>} - True if the project exists, false if not
     * @async
     */
    async projectExists(id) {
        const result = await this.projects.findOne({id: id});

        return result ? true : false;
    }

    /**
     * Check for illegal wording on text
     * @param {string} text - The text to check for illegal wording 
     * @returns {Promise<boolean>} - True if the text contains illegal wording, false if not
     * @async
     */
    async checkForIllegalWording(text) {
        const illegalWords = await this.illegalList.findOne
            ({ id: "illegalWords" }).items;
        const illegalWebsites = await this.illegalList.findOne
            ({ id: "illegalWebsites" }).items;
        const spacedOutWordsOnly = await this.illegalList.findOne
            ({ id: "spacedOutWordsOnly" }).items;
        const joined = illegalWords.concat(illegalWebsites, spacedOutWordsOnly);
        
        for (const item in joined) {
            if (text.includes(item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Check for slightly illegal wording on text
     * @param {string} text - The text to check for slightly illegal wording
     * @returns {Promise<boolean>} - True if the text contains slightly illegal wording, false if not
     * @async
     */
    async checkForSlightlyIllegalWording(text) {
        const potentiallyUnsafeWords = await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWords" }).items;
        const potentiallyUnsafeWordsSpacedOut = await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWordsSpacedOut" }).items;
        const joined = potentiallyUnsafeWords.concat(potentiallyUnsafeWordsSpacedOut);
        
        for (const item in joined) {
            if (text.includes(item)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Set a new list of illegal words
     * @param {Array<string>} words - The new list of illegal words
     * @param {string} type - The type of the illegal item
     * @async
     */
    async setIllegalWords(words, type) {
        await this.illegalList.updateOne({id: type}, {$set: {items: words}});
    }

    /**
     * Add an illegal word
     * @param {string} word - The item to add
     * @param {string} type - The type of the illegal item
     * @async
     */
    async addIllegalWord(word, type) {
        await this.illegalList.updateOne({id: type}, {$push: {items: word}});
    }

    /**
     * Remove an illegal word
     * @param {string} word - The item to remove 
     * @param {string} type - The type of the illegal item
     * @async
     */
    async removeIllegalWord(word, type) {
        await this.illegalList.updateOne({id: type}, {$pull: {items: word}});
    }

    /**
     * Get all illegal words
     * @returns {Promise<Object>} - Object containing all the illegal words
     * @async
     */
    async getIllegalWords() {
        const illegalWords = await this.illegalList.findOne
            ({ id: "illegalWords" }).items;
        const illegalWebsites = await this.illegalList.findOne
            ({ id: "illegalWebsites" }).items;
        const spacedOutWordsOnly = await this.illegalList.findOne
            ({ id: "spacedOutWordsOnly" }).items;
        const potentiallyUnsafeWords = await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWords" }).items;
        const potentiallyUnsafeWordsSpacedOut = await this.illegalList.findOne
            ({ id: "potentiallyUnsafeWordsSpacedOut" }).items;

        return {
            illegalWords: illegalWords,
            illegalWebsites: illegalWebsites,
            spacedOutWordsOnly: spacedOutWordsOnly,
            potentiallyUnsafeWords: potentiallyUnsafeWords,
            potentiallyUnsafeWordsSpacedOut: potentiallyUnsafeWordsSpacedOut
        }
    }

    /**
     * Verify the state from an OAuth2 request
     * @param {string} state - The state to verify 
     * @returns {Promise<boolean>} - True if the state is valid, false if not
     * @async
     */
    async verifyOAuth2State(state) {
        const result = await this.oauthStates.findOne({ state: state });

        // now get rid of the state cuz uh we dont need it anymore

        if (result)
        await this.oauthStates.deleteOne({ state: state })

        return result ? true : false;
    }

    /**
     * Generate a new OAuth2 state and save it for verification
     * @returns {Promise<string>} - The state
     */
    async generateOAuth2State(extra="") {
        const state = ULID.ulid() + extra;

        await this.oauthStates.insertOne({ state: state });

        return state;
    }

    /**
     * Make an OAuth2 request
     * @param {string} code - The from the original OAuth2 request
     * @param {string} method - The method of OAuth2 request
     * @returns 
     */
    async makeOAuth2Request(code, method) {
        switch (method) {
            case "scratch":
                const response = await fetch(`https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/tokens`, {
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
        }
    }

    async makeOAuth2Account(method, data) {
        switch (method) {
            case "scratch":
                let username = data.user_name;
                const id = data.user_id;

                let n = 1;
                while (await this.existsByUsername(username)) {
                    username = data.user_name + n;
                    n++;
                }

                const token = await this.createAccount(username, randomBytes(32).toString(), "")

                // set their password HASH to nothing so cant login with a password
                await this.users.updateOne({ username: username }, { $set: { password: "" } });

                await this.addOAuthMethod(username, method, id);
                return token;
        }
    }

    /**
     * Convert a project json to protobuf format
     * @param {Object} json - The project json 
     * @returns {Buffer} - The project protobuf
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
            metaAgent: ""
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

            // loop over the customVars
            // TODO: make this :skullington:

            // loop over the blocks
            for (const block in json.targets[target].blocks) {
                newtarget.blocks[block] = {
                    opcode: json.targets[target].blocks[block].opcode,
                    next: json.targets[target].blocks[block].next,
                    parent: json.targets[target].blocks[block].parent,
                    inputs: {},
                    fields: {},
                    shadow: json.targets[target].blocks[block].shadow,
                    topLevel: json.targets[target].blocks[block].topLevel,
                    x: json.targets[target].blocks[block].x,
                    y: json.targets[target].blocks[block].y,
                }

                // loop over the inputs
                for (const input in json.targets[target].blocks[block].inputs) {
                    newtarget.blocks[block].inputs[input] = JSON.stringify(json.targets[target].blocks[block].inputs[input]);
                }

                // loop over the fields
                for (const field in json.targets[target].blocks[block].fields) {
                    newtarget.blocks[block].fields[field] = JSON.stringify(json.targets[target].blocks[block].fields[field]);
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
            newjson.extensionData[extensionData] = this.castToString(json.extensionData[extensionData]);
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
     * @param {Buffer} buffer - The project protobuf
     * @returns {Object} - The project json
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
            }
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

            // customvars

            for (const block in target.blocks) {
                newTarget.blocks[block] = {
                    opcode: target.blocks[block].opcode,
                    next: target.blocks[block].next || null,
                    parent: target.blocks[block].parent || null,
                    inputs: {},
                    fields: {},
                    shadow: target.blocks[block].shadow,
                    topLevel: target.blocks[block].topLevel,
                    x: target.blocks[block].x,
                    y: target.blocks[block].y
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
                spriteName: json.monitors[monitor].spriteName || null,
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

            newJson.monitors.push(newMonitor);
        }

        for (const extensionData in json.extensionData) {
            newJson.extensionData[extensionData] = JSON.parse(json.extensionData[extensionData]);
        }

        for (const extensionURL in json.extensionURLs) {
            newJson.extensionURLs[extensionURL] = json.extensionURLs[extensionURL];
        }

        return newJson;
    }
    
    /**
     * Cast a value to a string
     * @param {any} value - The value to cast 
     * @returns {string} - The value as a string
     */
    castToString(value) {
        if (typeof value !== "object") {
            return String(value);
        }

        return JSON.stringify(value);
    }

    async setLegalExtensions(extensions) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$set: {items: extensions}});
    }

    async addLegalExtension(extension) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$push: {items: extension}});
    }

    async removeLegalExtension(extension) {
        await this.illegalList.updateOne({id: "legalExtensions"}, {$pull: {items: extension}});
    }

    async checkExtensionIsAllowed(extension) {
        if (!extension) return true;

        const extensionsConfig = await this.illegalList.findOne({id: "legalExtensions"});
        const isIncluded = extensionsConfig.items.includes(extension);

        return isIncluded;
    };

    async newTokenGen(username) {
        const token = ULID.ulid();
        
        await this.users.updateOne({ username: username }, { $set: { token: token, lastLogin: Date.now() } });

        // check
        const result = await this.users.findOne({ username: username });

        return token;
    }
}

module.exports = UserManager;