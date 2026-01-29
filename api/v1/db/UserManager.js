require("dotenv").config();
const { randomInt, randomBytes, createHash } = require("node:crypto");
const bcrypt = require("bcrypt");
const { MongoClient } = require("mongodb");
const ULID = require("ulid");
const Minio = require("minio");
const fs = require("fs");
const path = require("path");
var prompt = require("prompt-sync")();
const Mailjet = require("node-mailjet");
const os = require("os");
const pmp_protobuf = require("pmp-protobuf");
const sharp = require("sharp");

const using_backblaze = process.env.UseBackblaze == "true";

const basePFP = fs.readFileSync(path.join(__dirname, "./penguin.png"));
const deleted_thumb = fs.readFileSync(
    path.join(__dirname, "../../../deletedThumbnail.png"),
);
const deleted_thumb_buffer = sharp(deleted_thumb).resize(240, 180).toBuffer();

const REMOVE_SYMBOLS_REGEX = /[\s._*!-+/]+/g;

class UserManager {
    /**
     * Initialize the database
     * @param {number} maxviews maximum amount of views before the view counter resets
     * @param {number} viewresetrate time in milliseconds before the view counter resets
     * @async
     */
    async init(maxviews, viewresetrate) {
        this.client = new MongoClient(
            process.env.MongoUri || "mongodb://localhost:27017",
        );
        await this.client.connect();
        this.db = this.client.db("pm_apidata");
        this.users = this.db.collection("users");
        await this.users.createIndex({ username: 1 }, { unique: true });
        await this.users.createIndex({ id: 1 }, { unique: true });
        await this.users.createIndex({ token: 1 }, { unique: true });
        this.accountCustomization = this.db.collection("accountCustomization");
        this.loggedIPs = this.db.collection("loggedIPs");
        await this.loggedIPs.createIndex({ id: 1 });
        await this.loggedIPs.createIndex({ ip: 1 });
        this.passwordResetStates = this.db.collection("passwordResetStates");
        // await this.passwordResetStates.dropIndexes();
        await this.passwordResetStates.createIndex(
            { expireAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
        this.sentEmails = this.db.collection("sentEmails");
        // await this.sentEmails.dropIndexes();
        await this.sentEmails.createIndex(
            { expireAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
        this.followers = this.db.collection("followers");
        this.oauthIDs = this.db.collection("oauthIDs");
        this.reports = this.db.collection("reports");
        this.runtimeConfig = this.db.collection("runtimeConfig");
        //this.runtimeConfig.deleteMany({});
        if (!(await this.runtimeConfig.findOne({ id: "viewingEnabled" })))
            this.runtimeConfig.insertOne({
                id: "viewingEnabled",
                value: process.env.ViewingEnabled == "true",
            });
        if (!(await this.runtimeConfig.findOne({ id: "uploadingEnabled" })))
            this.runtimeConfig.insertOne({
                id: "uploadingEnabled",
                value: process.env.UploadingEnabled == "true",
            });
        if (
            !(await this.runtimeConfig.findOne({
                id: "accountCreationEnabled",
            }))
        )
            this.runtimeConfig.insertOne({
                id: "accountCreationEnabled",
                value: process.env.AccountCreationEnabled == "true",
            });

        this.projects = this.db.collection("projects");
        //this.projects.dropIndexes();
        await this.projects.createIndex({
            title: "text",
            instructions: "text",
            notes: "text",
        });
        // index for front page, sort by newest
        await this.projects.createIndex({ lastUpdate: -1 });
        await this.projects.createIndex({ id: 1 }, { unique: true });
        this.projectStats = this.db.collection("projectStats");
        this.messages = this.db.collection("messages");
        this.oauthStates = this.db.collection("oauthStates");
        await this.oauthStates.createIndex(
            { expireAt: 1 },
            { expireAfterSeconds: 60 * 5 },
        ); // give 5 minutes
        this.userFeed = this.db.collection("userFeed");
        await this.userFeed.createIndex(
            { expireAt: 1 },
            { expireAfterSeconds: Number(process.env.FeedExpirationTime) },
        );
        this.illegalList = this.db.collection("illegalList");
        this.lastPolicyUpdates = this.db.collection("lastPolicyUpdates");
        if (!(await this.lastPolicyUpdates.findOne({ id: "privacyPolicy" }))) {
            this.lastPolicyUpdates.insertOne({
                id: "privacyPolicy",
                lastUpdate: Date.now(),
            });
            this.lastPolicyUpdates.insertOne({
                id: "TOS",
                lastUpdate: Date.now(),
            });
            this.lastPolicyUpdates.insertOne({
                id: "guidelines",
                lastUpdate: Date.now(),
            });
        }

        {
            if (
                !(await this.illegalList.countDocuments({ id: "illegalWords" }))
            ) {
                this.illegalList.insertOne({ id: "illegalWords", items: [] });
            }
            if (
                !(await this.illegalList.countDocuments({
                    id: "illegalWebsites",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "illegalWebsites",
                    items: [],
                });
            }
            if (
                !(await this.illegalList.countDocuments({
                    id: "spacedOutWordsOnly",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "spacedOutWordsOnly",
                    items: [],
                });
            }
            if (
                !(await this.illegalList.countDocuments({
                    id: "potentiallyUnsafeWords",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "potentiallyUnsafeWords",
                    items: [],
                });
            }
            if (
                !(await this.illegalList.countDocuments({
                    id: "potentiallyUnsafeWordsSpacedOut",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "potentiallyUnsafeWordsSpacedOut",
                    items: [],
                });
            }

            if (
                !(await this.illegalList.countDocuments({
                    id: "legalExtensions",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "legalExtensions",
                    items: [],
                });
            }

            if (
                !(await this.illegalList.countDocuments({
                    id: "unsafeUsernames",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "unsafeUsernames",
                    items: [],
                });
            }
            if (
                !(await this.illegalList.countDocuments({
                    id: "potentiallyUnsafeUsernames",
                }))
            ) {
                this.illegalList.insertOne({
                    id: "potentiallyUnsafeUsernames",
                    items: [],
                });
            }
        }

        this.blocking = this.db.collection("blocking");
        this.prevReset = Date.now();
        this.views = [];

        this.maxviews = maxviews ? maxviews : 10000;
        this.viewresetrate = viewresetrate ? viewresetrate : 1000 * 60 * 60;

        this.tagWeights = this.db.collection("tagWeights");
        this.performance_logging = this.db.collection("system.profile");

        // Setup minio

        this.minioClient = new Minio.Client({
            endPoint: process.env.MinioEndPoint,
            port: Number(process.env.MinioPort),
            useSSL: false,
            accessKey: process.env.MinioClientID,
            secretKey: process.env.MinioClientSecret,
        });
        // project bucket
        await this._makeBucket("projects");
        // project thumbnail bucket
        await this._makeBucket("project-thumbnails");
        // project asset bucket
        await this._makeBucket("project-assets");
        // pfp bucket
        await this._makeBucket("profile-pictures");

        if (using_backblaze) {
            this.using_bb_upload_url = 0;
            await this.generateBBAuthToken();
        }
    }

    /**
     * Generate an auth token
     * @returns {Promise<void>}
     */
    async generateBBAuthToken() {
        const key_id = process.env.BackblazeKeyID;
        const key = process.env.BackblazeKey;

        const auth_header =
            "Basic" + Buffer.from(key_id + ":" + key).toString("base64");

        const headers = new Headers();
        headers.set("Authorization", auth_header);

        const results = await fetch(
            "https://api.backblazeb2.com/b2api/v4/b2_authorize_account",
            {
                headers,
            },
        ).then((res) => res.json());

        this.bb_auth_token = results.authorizationToken;

        const hour = 1000 * 60 * 60;
        const day = hour * 24;
        this.need_new_bb_auth_token = Date.now() + day - hour;

        const sa = results.apiInfo.storageApi;
        this.bb_api_url = sa.apiUrl;
        this.bb_download_url =
            process.env.UseCustomBackblazeDownloadUrl == "true"
                ? process.env.BackblazeDownloadUrl
                : sa.downloadUrl;

        await this.generateBBUploadURL();
    }

    /**
     * Generates an upload url
     * @returns {Promise<void>}
     */
    async generateBBUploadURL() {
        const headers = new Headers();
        headers.set("Authorization", await this.getBBAuthToken());

        const hour = 1000 * 60 * 60;
        const day = hour * 24;
        this.need_new_bb_upload_url = Date.now() + day - hour;

        const results = await fetch(
            `${this.bb_api_url}/b2api/v4/b2_get_upload_url?bucketId=${process.env.BackblazeBucketID}`,
            {
                headers,
            },
        ).then((res) => res.json());

        this.bb_upload_url = results.uploadUrl;
        this.bb_upload_auth_token = results.authorizationToken;
    }

    /**
     * Gets the Backblaze auth token or fetches it if its expired
     * @returns {Promise<string>}
     */
    async getBBAuthToken() {
        if (this.need_new_bb_auth_token <= Date.now()) {
            await this.generateBBAuthToken();
        }

        return this.bb_auth_token;
    }

    /**
     * Gets the Backblaze upload url or fetches it if its expired
     * @returns {Promise<string>}
     */
    async getBBUploadUrl() {
        if (
            this.need_new_bb_upload_url <= Date.now() ||
            this.using_bb_upload_url > 1
        ) {
            await this.generateBBUploadURL();
        }

        return this.bb_upload_url;
    }

    /**
     * List the raw data returned by Backblaze's search.
     * @param {string} prefix The prefix to search for
     * @param {number} n The amount of items to return. Cannot exceed 10000.
     * @returns {Promise<Array<Object>>}
     */
    async listDataWithPrefixBackblaze(prefix, n = 1000) {
        // n is default 1k because max per class c is 1k, so we don't wanna go above that.
        // if we do, it charges us for 2 instead of 1.
        // we shouldn't have that many assets anyways.

        const headers = new Headers();
        headers.set("Authorization", await this.getBBAuthToken());

        const bucketID = process.env.BackblazeBucketID;

        const results = [];
        let startFileName = null;

        while (n != 0) {
            const num = n > 10000 ? 10000 : n;

            let url =
                this.bb_api_url +
                `/b2api/v4/b2_list_file_names?bucketId=${bucketID}&maxFileCount=${num}&prefix=${prefix}`;

            if (startFileName) {
                url += `&startFileName=${startFileName}`;
            }

            // we don't url encode prefix since it *should* just be a number and maybe an underscore and also im lazy
            const res = await fetch(url, {
                headers,
            }).then((res) => res.json());

            results.push(...res.files);

            n -= num;

            startFileName = res.nextFileName;
        }

        return results;
    }

    /**
     * List the names of files with a given prefix from Backblaze.
     * @param {string} prefix The prefix to search for
     * @param {number} n The number of results to get. Cannot exceed 10000.
     * @returns {Promise<Array<string>>}
     */
    async listWithPrefixBackblaze(prefix, n = 1000) {
        return (await this.listDataWithPrefixBackblaze(prefix, n)).map(
            (file) => file.fileName,
        );
    }

    /**
     * Save a file to Backblaze.
     * @param {string} name The name of the file
     * @param {Buffer} file The buffer of the file
     */
    async saveToBackblaze(name, file) {
        this.using_bb_upload_url += 1;
        const upload_url = await this.getBBUploadUrl();
        const auth_token = this.bb_upload_auth_token;

        const len = file.length;

        const headers = new Headers();
        headers.set("Authorization", auth_token);
        headers.set("X-Bz-File-Name", encodeURIComponent(name));
        headers.set("Content-Type", "b2/x-auto");
        headers.set("Content-Length", len);
        const hash = createHash("sha1");
        hash.update(file);
        headers.set("X-Bz-Content-Sha1", hash.digest("hex"));

        const result = await fetch(upload_url, {
            method: "POST",
            headers,
            body: file,
        });

        this.using_bb_upload_url -= 1;

        if (!result.ok) {
            console.log(await result.json());
            console.log("FAILED TO SAVE TO BACKBLAZE!!!! BIG BAD!!!!!");
        }
    }

    /**
     * Download a file from the backblaze asset storage
     * @param {string} name The name of the requested file
     * @returns {Promise<Buffer>}
     */
    async downloadFromBackblaze(name) {
        const url = `${this.bb_download_url}/file/${process.env.BackblazeBucketName}/${name}`;

        const buffer = Buffer.from(
            await fetch(url).then((res) => res.arrayBuffer()),
        );

        return buffer;
    }

    /**
     * Rename an object in Backblaze.
     * @param {string} old_name The old name
     * @param {string} new_name The new name
     * @returns {Promise<void>}
     */
    async renameObjectBackblaze(old_name, new_name) {
        const id = await this.getBBFileID(old_name);

        await this.copyObjectBackblazeID(id, new_name);
        await this.deleteFileBackblazeID(old_name, id);
    }

    /**
     * Copy an object in Backblaze
     * @param {string} old_name The old name
     * @param {string} new_name The new name
     * @returns {Promise<void>}
     */
    async copyObjectBackblaze(old_name, new_name) {
        const file_id = await this.getBBFileID(old_name);

        return await this.copyObjectBackblazeID(file_id, new_name);
    }

    /**
     * Copy an object in Backblaze given it's ID, in order to avoid multiple ID lookups.
     * @param {string} file_id The ID of the file
     * @param {string} new_name The new name
     * @returns {Promise<void>}
     */
    async copyObjectBackblazeID(file_id, new_name) {
        const auth_token = await this.getBBAuthToken();
        const api_url = this.bb_api_url;

        const headers = new Headers();
        headers.set("Authorization", auth_token);

        const body = JSON.stringify({
            sourceFileId: file_id,
            destinationBucketId: process.env.BackblazeBucketID,
            fileName: new_name,
            metadataDirective: "COPY",
        });

        const url = api_url + "/b2api/v4/b2_copy_file";

        const result = await fetch(url, {
            method: "POST",
            headers,
            body,
        }).then((res) => res.ok());

        if (!result) {
            console.log("FAILED TO COPY!!!! VERY BAD!!!!!!!!!!!");
        }
    }

    /**
     * Delete a file from Backblaze
     * @param {string} fileName The name of the file
     * @returns {Promise<void>}
     */
    async deleteFileBackblaze(fileName) {
        const id = await this.getBBFileID(fileName);

        return await this.deleteFileBackblazeID(fileName, id);
    }

    /**
     * Delete a file from Backblaze given it's ID, in order to avoid multiple ID lookups.
     * @param {string} fileName The name of the file
     * @param {string} fileId the ID of the file
     * @returns {Promise<void>}
     */
    async deleteFileBackblazeID(fileName, fileId) {
        const auth_token = await this.getBBAuthToken();
        const api_url = this.bb_api_url;

        const headers = new Headers();
        headers.set("Authorization", auth_token);

        const body = JSON.stringify({
            fileName,
            fileId,
            bypassGovernance: false,
        });

        const url = api_url + "/b2api/v4/b2_delete_file_version";

        const result = await fetch(url, {
            method: "POST",
            headers,
            body,
        }).then((res) => res.ok);

        if (!result) {
            console.log("FAILED TO DELETE FILE!!!! BIG BAD!!!!");
        }
    }

    /**
     * Get the ID of a file from Backblaze
     * @param {string} name The name of the file
     * @returns {Promise<string>}
     */
    async getBBFileID(name) {
        // boy do i hate backblaze
        return await this.listWithPrefixBackblaze(name, 1)[0];
    }

    /**
     * Delete multiple objects from Backblaze given a prefix
     * @param {string} prefix The prefix to search for
     * @param {number} n The number of objects to search for. Cannot exceed 10000.
     */
    async deleteMultipleObjectsBackblaze(prefix, n = 1000) {
        const objects = await this.listDataWithPrefixBackblaze(prefix, n);

        for (const obj of objects) {
            await this.deleteFileBackblazeID(obj.fileName, obj.fileId);
        }
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
        throw new Error("Resetting is disabled");

        if (!understands) {
            let unde = prompt("This deletes ALL DATA. Are you sure? (Y/n) ");
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
    async createAccount(
        username,
        real_username,
        password,
        email,
        birthday,
        country,
        is_studio,
        utils,
        res,
    ) {
        const result = await this.users.findOne({ username: username });
        if (result) {
            return false;
        }

        const illegalWordingError = async (text, type) => {
            const trigger = await this.checkForUnsafeUsername(text);
            if (trigger) {
                utils.error(res, 400, "IllegalWordsUsed");

                const illegalWordIndex =
                    await this.getIndexOfUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username,
                );

                return true;
            }
            return false;
        };

        const potentiallyIllegalWordingError = async (text, type) => {
            let trigger = await this.checkForPotentiallyUnsafeUsername(text);
            if (trigger) {
                const illegalWordIndex =
                    await this.getIndexOfPotentiallyUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                utils.logs.sendHeatLog(
                    before + "\x1b[33;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username,
                    0xffbb00,
                );
                return true;
            }
            return false;
        };

        if (await illegalWordingError(username, "username")) {
            return false;
        }

        await potentiallyIllegalWordingError(username, "username");

        const hash = password ? await bcrypt.hash(password, 10) : "";
        const id = ULID.ulid();
        const token = randomBytes(32).toString("hex");
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
            onWatchlist: false,
        });

        await this.minioClient.putObject("profile-pictures", id, basePFP);

        return [token, id];
    }

    async canCreateAccount() {
        return (
            await this.runtimeConfig.findOne({ id: "accountCreationEnabled" })
        ).value;
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

        const deletionSuccess =
            (
                await this.users.deleteOne({
                    username: username,
                })
            ).deletedCount > 0;

        if (!deletionSuccess) return false;

        await this.minioClient.removeObject("profile-pictures", result.id);

        // search for all projects by the user and delete them
        const user_id = result.id;

        const projects = await this.projects
            .find({ author: user_id })
            .toArray();

        for (const project of projects) {
            await this.deleteProject(project.id);
        }

        // delete all references to the user in the followers collection
        await this.followers.deleteMany({ target: user_id });
        const target_deletes = await this.followers
            .find({ follower: user_id })
            .toArray();

        for (const target of target_deletes) {
            await this.followers.deleteOne({ _id: target._id });
            // decrement the follower count of the target
            await this.users.updateOne(
                { id: target.target },
                { $inc: { followers: -1 } },
            );
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
        return await this.users.findOne({ username: username });
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

        if (
            (result.permBanned || result.unbanTime > Date.now()) &&
            !allowBanned
        ) {
            return false;
        }

        if (await bcrypt.compare(password, result.password)) {
            return await this.newTokenGen(username);
        } else {
            return false;
        }
    }

    /**
     * @typedef {Object} loginResult
     * @property {string} username The user's username. Blank if unsuccessful
     * @property {string} id The user's id. Blank if unsuccessful
     * @property {boolean} success If the login was successful
     * @property {boolean} exists If the account even exists
     */

    /**
     * Login with a token
     * @param {string?} username username of the user. Optional
     * @param {string} token token of the user
     * @param {boolean} allowBanned allow banned users to login
     * @returns {Promise<loginResult>} Result of the login attempt
     * @async
     */
    async loginWithToken(token, allowBanned) {
        const result = await this.users.findOne({ token });

        if (!result)
            return { success: false, username: "", id: "", exists: false };

        if (
            (result.permBanned || result.unbanTime > Date.now()) &&
            !allowBanned
        ) {
            return {
                success: false,
                username: result.username,
                id: result.id,
                exists: true,
            };
        }

        // login invalid if more than the time
        if (
            result.lastLogin +
                (Number(process.env.LoginInvalidationTime) || 259200000) <
            Date.now()
        ) {
            return {
                success: false,
                username: result.username,
                id: result.id,
                exists: true,
            };
        }

        this.users.updateOne({ token }, { $set: { lastLogin: Date.now() } });
        return {
            success: true,
            username: result.username,
            id: result.id,
            exists: true,
        };
    }

    async getRealUsername(username) {
        return (await this.users.findOne({ username: username })).real_username;
    }

    /**
     * Check if a user exists by username
     * @param {string} username username of the user
     * @returns {Promise<boolean>} true if the user exists, false if not
     * @async
     */
    async existsByUsername(username, showBanned = false) {
        let query = { username: username };
        if (!showBanned) {
            query = {
                $and: [
                    query,
                    { permBanned: false, unbanTime: { $lt: Date.now() } },
                ],
            };
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
    async getIDByUsername(username, throw_err = true) {
        const result = await this.users.findOne({ username: username });
        if (!result) {
            if (throw_err) {
                const error = `----------\nCould not get ${username}'s id\n----------`;
                console.log(error);
                throw error;
            } else {
                return false;
            }
        }
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
        await this.users.updateOne(
            { id: id },
            { $set: { username: newUsername, real_username } },
        );
    }

    async changeUsername(username, newUsername, real_username) {
        await this.users.updateOne(
            { username: username },
            { $set: { username: newUsername, real_username } },
        );
    }

    /**
     * Change the password of a user
     * @param {string} username username of the user
     * @param {string} newPassword new password of the user
     * @async
     */
    async changePassword(username, newPassword) {
        const hash = await bcrypt.hash(newPassword, 10);
        await this.users.updateOne(
            { username: username },
            { $set: { password: hash, lastLogin: 0 } },
        ); // sets password and invalidates token
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

        const result = (await this.oauthIDs.find({ id: id }).toArray()).map(
            (x) => x.method,
        );

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

        await this.oauthIDs.insertOne({ id: id, method: method, code: code });
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
        const result = await this.oauthIDs.findOne({
            method: method,
            code: id,
        });

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
        await this.users.updateOne(
            { username: username },
            { $set: { bio: newBio } },
        );
    }

    /**
     * Change the favorite project of a user
     * @param {string} username username of the user
     * @param {number} type type of the project (the description that will be shown)
     * @param {number} id id of the project
     * @async
     */
    async changeFavoriteProject(username, type, id) {
        await this.users.updateOne(
            { username: username },
            { $set: { favoriteProjectType: type, favoriteProjectID: id } },
        );
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
        await this.users.updateOne(
            { username: username },
            { $set: { cubes: amount } },
        );
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
        await this.users.updateOne(
            { username: username },
            { $set: { rank: rank } },
        );
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
        await this.users.updateOne(
            { username: username },
            { $set: { lastUpload: lastUpload } },
        );
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
     * Check if a user is a donator
     * @param {string} username Username of the user
     * @returns {Promise<boolean>} if the user is a donator or not
     */
    async isDonator(username) {
        const result = await this.users.findOne({ username: username });

        return result.badges.indexOf("donator") > -1;
    }

    /**
     * Add a badge to a user
     * @param {string} username username of the user
     * @param {string} badge the badge to add
     * @async
     */
    async addBadge(username, badge) {
        await this.users.updateOne(
            { username: username },
            { $push: { badges: badge } },
        );
    }

    async setBadges(username, badges) {
        await this.users.updateOne(
            { username: username },
            { $set: { badges: badges } },
        );
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
        await this.users.updateOne(
            { username: username },
            { $pull: { badges: badge } },
        );
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
        await this.users.updateOne(
            {
                username: username,
            },
            {
                $set: { featuredProject: id },
            },
        );
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
        await this.users.updateOne(
            {
                username: username,
            },
            {
                $set: { featuredProjectTitle: title },
            },
        );
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
        await this.users.updateOne(
            { username: username },
            { $set: { admin: admin } },
        );
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
        await this.users.updateOne(
            { username: username },
            { $set: { moderator: moderator } },
        );
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
        const result = (await this.users.find({ admin: true }).toArray()).map(
            (admin) => {
                return { id: admin.id, username: admin.username };
            },
        );

        return result;
    }

    /**
     * Get all moderators
     * @returns {Promise<Array<Object>>} Array of all moderators
     * @async
     */
    async getAllModerators() {
        const result = (
            await this.users.find({ moderator: true }).toArray()
        ).map((admin) => {
            return { id: admin.id, username: admin.username };
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
    async setPermBanned(username, banned, reason, remove_follows = true) {
        await this.users.updateOne(
            { username: username },
            { $set: { permBanned: banned, banReason: reason } },
        );

        const user_id = await this.getIDByUsername(username);
        await this.privateAllProjects(user_id, banned);

        // remove all reports by the user
        await this.reports.deleteMany({ reporter: user_id });

        // remove all reports on the user
        await this.reports.deleteMany({ reportee: user_id });

        if (remove_follows) {
            // get all references to the user in the followers collection

            const following = await this.followers
                .find({ follower: user_id })
                .toArray();

            for (const follow of following) {
                await this.followers.deleteOne({ _id: follow._id });
                // decrement the following count of the follower
                await this.users.updateOne(
                    { id: follow.follower },
                    { $inc: { following: -1 } },
                );
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
        await this.projects.updateMany(
            {
                author: user_id,
            },
            {
                $set: {
                    public: !toggle,
                },
            },
        );
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
    async setEmail(username, email, verify = false) {
        if (await this.emailInUse(email)) return;

        await this.users.updateOne(
            { username: username },
            { $set: { email: email, emailVerified: verify } },
        );
    }

    /**
     * Logout a user
     * @param {string} username username of the user
     * @async
     */
    async logout(username) {
        await this.users.updateOne(
            { username: username },
            { $set: { lastLogin: 0 } },
        ); // makes the token invalid
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
            id: ULID.ulid(),
        });
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
        const result = await this.reports
            .aggregate([
                {
                    $match: { type: type },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
        const result = await this.reports
            .aggregate([
                {
                    $match: { reportee: reportee },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
        const result = await this.reports
            .aggregate([
                {
                    $match: { reporter: reporter },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
        const result = await this.reports.findOne({
            reporter: reporter,
            reportee: reportee,
        });

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
        const result = await this.reports
            .aggregate([
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
     * @param {string} remix ID of the project this is a remix of. Undefined if not a remix.
     * @param {string} rating Rating of the project.
     * @async
     */
    async publishProject(
        projectBuffer,
        assetBuffers,
        author,
        title,
        imageBuffer,
        instructions,
        notes,
        remix,
        rating,
    ) {
        let id;
        // ATODO: replace this with a ulid somehow
        // i love being whimsical ^^
        do {
            id = randomInt(0, 9999999999).toString();
            id = "0".repeat(10 - id.length) + id;
        } while (id !== 0 && (await this.projects.findOne({ id: id })));

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
            hardRejectTime: 0,
            impressions: 0,
            noFeature: false,
        });

        // minio bucket stuff
        await this.minioClient.putObject("projects", id, projectBuffer);
        await this.minioClient.putObject("project-thumbnails", id, imageBuffer);
        for (const asset of assetBuffers) {
            const name = `${id}_${asset.id}`;

            if (using_backblaze) {
                await this.saveToBackblaze(name, asset.buffer);
            } else {
                await this.minioClient.putObject(
                    "project-assets",
                    name,
                    asset.buffer,
                );
            }
        }

        await this.addToFeed(
            author,
            remix !== "0" ? "remix" : "upload",
            remix !== "0" ? remix : id,
        );

        return id;
    }

    async isFeatured(projectId) {
        const result = await this.projects.findOne({
            id: projectId,
            featured: true,
        });

        return !!result;
    }

    /**
     * Check if a project can be featured
     * @param {string} projectID ID of the project
     * @returns {Promise<boolean>}
     */
    async canBeFeatured(projectID) {
        const result = await this.projects.findOne({ id: projectID });

        return !result.noFeature;
    }

    /**
     * Disable/enable if a project can be featured
     * @param {string} projectID ID of the project
     * @param {boolean} canBeFeatured true if can be, false if cannot be
     * @returns {Promise<>}
     */
    async setCanBeFeatured(projectID, canBeFeatured) {
        await this.projects.updateOne(
            { id: projectID },
            { $set: { noFeature: !canBeFeatured } },
        );
    }

    /**
     * Get remixes of a project
     * @param {number} id
     * @returns {Promise<Array<Object>>} Array of remixes of the specified project
     * @async
     */
    async getRemixes(id, page, pageSize) {
        const aggResult = await this.projects
            .aggregate([
                {
                    $match: { remix: id, public: true, softRejected: false },
                },
                {
                    $sort: { lastUpdate: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $unset: ["_id", "authorInfo"],
                },
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
    async updateProject(
        id,
        projectBuffer,
        assetBuffers,
        title,
        imageBuffer,
        instructions,
        notes,
        rating,
    ) {
        if (
            (projectBuffer === null && assetBuffers !== null) ||
            (projectBuffer !== null && assetBuffers === null)
        ) {
            return false;
        }

        await this.projects.updateOne(
            { id: id },
            {
                $set: {
                    title: title,
                    instructions: instructions,
                    notes: notes,
                    rating: rating,
                    lastUpdate: Date.now(),
                },
            },
        );

        // minio bucket stuff
        if (imageBuffer !== null) {
            await this.minioClient.putObject(
                "project-thumbnails",
                id,
                imageBuffer,
            );
        }

        if (projectBuffer !== null) {
            await this.minioClient.putObject("projects", id, projectBuffer);

            if (using_backblaze) {
                await this.deleteMultipleObjectsBackblaze(id);
            } else {
                await this.deleteMultipleObjects("project-assets", id);
            }
            // ATODO: instead of doing this just replace the ones that were edited
            // potentially we could just see which ones are new/not in use, since asset ids are meant to be the hash of the file?
            // we'll need to start verifying that the name IS the hash but we need to do that anyways to save on storage space.

            for (const asset of assetBuffers) {
                const name = `${id}_${asset.id}`;

                if (using_backblaze) {
                    await this.saveToBackblaze(name, asset.buffer);
                } else {
                    await this.minioClient.putObject(
                        "project-assets",
                        name,
                        asset.buffer,
                    );
                }
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
     * @param {string?} user_id of the user searching
     * @returns {Promise<Array<Object>>} Projects in the specified amount
     * @async
     */
    async getProjects(
        show_nonranked,
        page,
        pageSize,
        maxLookup,
        user_id,
        reverse = false,
    ) {
        let pipeline = [
            {
                $match: {
                    softRejected: false,
                    hardReject: false,
                    public: true,
                },
            },
            {
                $sort: { lastUpdate: reverse ? 1 : -1 },
            },
            {
                $skip: page * pageSize,
            },
            {
                $limit: maxLookup,
            },
        ];

        pipeline.push({
            $lookup: {
                from: "users",
                localField: "author",
                foreignField: "id",
                as: "authorInfo",
            },
        });

        if (!show_nonranked) {
            pipeline.push({ $match: { "authorInfo.rank": { $gt: 0 } } });
        }

        if (user_id) {
            pipeline.push(
                {
                    $lookup: {
                        from: "blocking",
                        localField: "author",
                        foreignField: "target",
                        as: "block_info",
                    },
                },
                {
                    $match: {
                        block_info: {
                            $not: {
                                $elemMatch: { blocker: user_id, active: true },
                            },
                        },
                    },
                },
                {
                    $unset: "block_info",
                },
            );
        }

        pipeline.push(
            {
                $skip: page * pageSize,
            },
            {
                $limit: pageSize,
            },
        );

        if (show_nonranked) {
            pipeline.push({
                // collect author data
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo",
                },
            });
        }

        pipeline.push(
            {
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                    fromDonator: {
                        $in: ["donator", "$authorInfo.badges"],
                    },
                },
            },
            {
                $unset: ["_id", "authorInfo"],
            },
        );

        const aggResult = await this.projects.aggregate(pipeline).toArray();

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
        const result = await this.projects
            .aggregate([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                    },
                },
                {
                    $sample: { size },
                },
                {
                    $unset: "_id",
                },
            ])
            .toArray();

        return result;
    }

    /**
     * Get projects by a specified author
     * @param {string} author ID of the author
     * @returns {Promise<Array<Object>>} Array of projects by the specified author
     * @async
     */
    async getProjectsByAuthor(
        author,
        page,
        pageSize,
        getPrivate = false,
        getSoftRejected = false,
    ) {
        const match = { author: author, hardReject: false };
        if (!getPrivate) match.public = true;
        if (!getSoftRejected) match.softRejected = false;
        const _result = await this.projects
            .aggregate([
                {
                    $match: match,
                },
                {
                    $sort: { lastUpdate: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
            ])
            .toArray();
        // you dont need to give it the user's username as... well... you prob already know it....

        return _result;
    }

    objectExists(bucketName, objectName) {
        return new Promise((resolve, reject) => {
            this.minioClient.statObject(
                bucketName,
                objectName,
                function (err, stat) {
                    if (err) {
                        if (err.code === "NotFound") {
                            resolve(false);
                        } else {
                            console.error(
                                "Error checking if object exists: ",
                                err,
                            );
                            reject(err);
                        }
                    } else {
                        resolve(true);
                    }
                },
            );
        });
    }

    /**
     * Read an object from a bucket
     * @param {string} bucketName Name of the bucket
     * @param {string} objectName Name of the object
     * @returns {Promise<Buffer>} The object
     */
    async readObjectFromBucket(bucketName, objectName) {
        /*
        if (!this.objectExists(bucketName, objectName)) {
            console.error("Tried to get project that doesn't exist: " + objectName);
            throw new Error("Tried to get project that doesn't exist: " + objectName);
        }
        */
        const stream = await this.minioClient
            .getObject(bucketName, objectName)
            .catch((err) => {
                console.error(
                    `ERROR READING OBJECT "${objectName}" from bucket ${bucketName}: ` +
                        err,
                );
            });

        if (!stream) return;

        const chunks = [];

        return new Promise((resolve, reject) => {
            stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
            stream.on("end", () => resolve(Buffer.concat(chunks)));
            stream.on("error", (err) => {
                console.log("ERROR" + err);
                reject(err);
            });
        });
    }

    /**
     * Get a project file
     * @param {number} id ID of the project wanted.
     * @returns {Promise<Buffer>} The project file.
     * @async
     */
    async getProjectFile(id) {
        const file = await this.readObjectFromBucket("projects", id);

        return file;
    }

    /**
     * Get a project image
     * @param {number} id ID of the project image wanted.
     * @returns {Promise<Buffer>} The project image file.
     */
    async getProjectImage(id) {
        // check if the file exists
        if (!(await this.minioClient.bucketExists("project-thumbnails"))) {
            return false;
        }

        let file;

        try {
            file = await this.readObjectFromBucket("project-thumbnails", id);
            if (!file) {
                return false;
            }
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
            });
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
        const items = using_backblaze
            ? await this.listWithPrefixBackblaze(id)
            : await this.listWithPrefix("project-assets", id);

        const result = [];

        for (const item of items) {
            const file = using_backblaze
                ? await this.downloadFromBackblaze(item)
                : await this.readObjectFromBucket("project-assets", item);

            if (!file) return false;

            result.push({ id: item.split("_")[1], buffer: file });
        }

        return result;
    }

    /**
     * Get project metadata for a specified project
     * @param {string} id ID of the project wanted.
     * @returns {Promise<Object>} The project data.
     * @async
     */
    async getProjectMetadata(id) {
        const p_id = String(id);

        const tempresult = await this.projects.findOne({ id: p_id });

        if (!tempresult) return false;

        tempresult.author = {
            id: tempresult.author,
            username: await this.getUsernameByID(tempresult.author),
        };

        // add the views, loves, and votes
        const result = {
            ...tempresult,
            loves: await this.getProjectLoves(p_id),
            votes: await this.getProjectVotes(p_id),
        };

        if (!result.impressions) {
            result.impressions = 0;
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
        const result = this.views.find(
            (view) => view.id === id && view.ip === ip,
        );

        return result ? true : false;
    }

    /**
     * Add a view to a project
     * @param {number} id ID of the project.
     * @param {string} ip IP of the person seeing the project.
     * @async
     */
    async projectView(id, ip) {
        if (
            this.views.length >= this.maxviews ||
            Date.now() - this.prevReset >= this.viewresetrate
        ) {
            this.views = [];
            this.prevReset = Date.now();
        }

        this.views.push({ id: id, ip: ip });
        await this.projects.updateOne({ id: id }, { $inc: { views: 1 } });
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
            type: "love",
        });

        return result ? true : false;
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
                type: "love",
            });
            return;
        }
        await this.projectStats.deleteOne({
            projectId: id,
            userId: userId,
            type: "love",
        });
    }

    /**
     * Get the amount of loves a project has
     * @param {number} id ID of the project
     * @returns {Promise<number>} Amount of loves the project has
     */
    async getProjectLoves(id) {
        const result = await this.projectStats
            .find({ projectId: id, type: "love" })
            .toArray();

        return result.length;
    }

    /**
     * Get who loved a project
     * @param {string} projectID ID of the project
     * @param {number} page Page to get
     * @param {number} pageSize Page size
     * @returns {Promise<Array<string>>} Array of user ids
     */
    async getWhoLoved(projectID, page, pageSize) {
        const result = await this.projectStats
            .aggregate([
                {
                    $match: { projectId: projectID, type: "love" },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
            ])
            .toArray();

        return result;
    }

    /**
     * Get who voted for a project
     * @param {string} projectID ID of the project
     * @param {number} page Page to get
     * @param {number} pageSize Page size
     * @returns {Promise<Array<string>>} Array of user ids
     */
    async getWhoVoted(projectID, page, pageSize) {
        const result = await this.projectStats
            .aggregate([
                {
                    $match: { projectId: projectID, type: "vote" },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
            type: "vote",
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
                type: "vote",
            });
            return;
        }
        await this.projectStats.deleteOne({
            projectId: id,
            userId: userId,
            type: "vote",
        });
    }

    /**
     * Get the amount of votes a project has
     * @param {number} id ID of the project
     * @returns {Promise<number>} Amount of votes the project has
     * @async
     */
    async getProjectVotes(id) {
        const result = await this.projectStats
            .find({ projectId: id, type: "vote" })
            .toArray();

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
        const aggResult = await this.projects
            .aggregate([
                {
                    $match: {
                        featured: true,
                        public: true,
                        softRejected: false,
                        hardReject: false,
                    },
                },
                {
                    $addFields: {
                        featureSortDate: { $ifNull: ["$featureDate", "$date"] },
                    },
                },
                {
                    $sort: {
                        featureSortDate: -1,
                    },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                        fromDonator: {
                            $in: ["donator", "$authorInfo.badges"],
                        },
                    },
                },
                {
                    $unset: ["_id", "authorInfo"],
                },
            ])
            .toArray();

        return aggResult;
    }

    /**
     * Feature/unfeature a project
     * @param {number} id ID of the project.
     * @param {boolean} feature True if featuring, false if unfeaturing.
     * @param {boolean} manuallyFeatured True if it was featured manually
     * @async
     */
    async featureProject(id, feature, manuallyFeatured) {
        await this.projects.updateOne(
            { id: id },
            {
                $set: {
                    featured: feature,
                    featureDate: Date.now(),
                    manuallyFeatured,
                },
            },
        );
    }

    /**
     * Set a projects metadata
     * @param {string} id ID of the project
     * @param {Object} data Data to set
     */
    async setProjectMetadata(id, data) {
        await this.projects.updateOne({ id: id }, { $set: data });
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
     * Get the amount of projects
     * @param {string} user_id id of the user
     * @returns {Promise<number>} Amount of projects the user has published
     * @async
     */
    async getProjectCountOfUser(user_id) {
        const result = await this.projects.countDocuments({ author: user_id });

        return result;
    }

    /**
     * delete a project
     * @param {number} id ID of the project
     * @async
     */
    async deleteProject(id) {
        await this.projects.deleteOne({ id: id });

        // TODO: remove mentions of the project from feed

        // remove the loves and votes
        await this.projectStats.deleteMany({ projectId: id });

        // remove the project file
        await this.minioClient.removeObject("projects", id);
        await this.minioClient.removeObject("project-thumbnails", id);

        if (using_backblaze) this.deleteMultipleObjectsBackblaze(id);
        else this.deleteMultipleObjects("project-assets", id);
    }

    async hardRejectProject(id) {
        await this.projects.updateOne(
            { id: id },
            { $set: { hardReject: true, hardRejectTime: new Date() } }, // doesn't need to be separate any more - we don't delete hard reject
        );
    }

    async isHardRejected(id) {
        const result = await this.projects.findOne({ id: id });

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
        const existing = await this.followers.findOne({
            follower,
            target: followee,
        });

        if (existing) {
            if (existing.active === follow) {
                return;
            }

            await this.followers.updateOne(
                { follower, target: followee },
                { $set: { active: follow } },
            );
        } else {
            await this.followers.insertOne({
                follower,
                target: followee,
                active: follow,
            });
        }

        await this.users.updateOne(
            { id: follower },
            { $inc: { following: follow ? 1 : -1 } },
        );
        await this.users.updateOne(
            { id: followee },
            { $inc: { followers: follow ? 1 : -1 } },
        );
    }

    /**
     * Check if a user is following another user
     * @param {string} follower ID of the person following
     * @param {string} followee ID of the person being followed
     * @returns {Promise<boolean>} True if they are following, false if not
     * @async
     */
    async isFollowing(follower, followee) {
        const result = await this.followers.findOne({
            follower,
            target: followee,
            active: true,
        });

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
        const result = await this.followers
            .aggregate([
                {
                    $match: { target: id, active: true },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "follower",
                        foreignField: "id",
                        as: "followerInfo",
                    },
                },
                {
                    $addFields: {
                        follower: {
                            id: "$follower",
                            username: {
                                $arrayElemAt: ["$followerInfo.username", 0],
                            },
                            banned: {
                                $arrayElemAt: ["$followerInfo.permBanned", 0],
                            },
                        },
                    },
                },
                {
                    $match: {
                        "follower.banned": false,
                    },
                },
                {
                    // only leave the follower field
                    $replaceRoot: { newRoot: "$follower" },
                },
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
        const id = await this.getIDByUsername(username);
        const result = await this.followers
            .aggregate([
                {
                    $match: { follower: id, active: true },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // collect author data
                    $lookup: {
                        from: "users",
                        localField: "target",
                        foreignField: "id",
                        as: "targetInfo",
                    },
                },
                {
                    $addFields: {
                        target: {
                            id: "$target",
                            username: {
                                $arrayElemAt: ["$targetInfo.username", 0],
                            },
                            banned: {
                                $arrayElemAt: ["$targetInfo.permBanned", 0],
                            },
                        },
                    },
                },
                {
                    $match: {
                        "target.banned": false,
                    },
                },
                {
                    // only leave the follower field
                    $replaceRoot: { newRoot: "$target" },
                },
                {
                    $unset: "banned",
                },
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
        const result = await this.followers.findOne({
            follower,
            target: followee,
        });

        return result ? true : false;
    }

    /**
     * Get the amount of people following a user
     * @param {string} username Username of the user
     * @returns {Promise<number|undefined>} Amount of people following the user
     */
    async getFollowerCount(username) {
        const result = await this.users.findOne({ username: username });

        return result ? result.followers : undefined;
    }

    /**
     * Send a message
     * @param {string} receiver ID of the person receiving the message
     * @param {string} message The message should follow the format specified in the schema
     * @param {boolean} disputable True if the message is disputable, false if not
     * @returns {Promise<string>} ID of the message
     * @async
     */
    async sendMessage(receiver, message, disputable, projectID = 0) {
        const id = ULID.ulid();

        await this.messages.insertOne({
            receiver: receiver,
            message: message,
            disputable: disputable,
            date: Date.now(),
            read: false,
            id: id,
            projectID: projectID,
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
        const result = await this.messages
            .aggregate([
                {
                    $match: { receiver: receiver },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
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
        const result = await this.messages.countDocuments({
            receiver: receiver,
        });

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
        const result = await this.messages
            .aggregate([
                {
                    $match: { receiver: receiver, read: false },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $unset: "_id",
                },
            ])
            .toArray();

        return result;
    }

    async getUnreadMessageCount(receiver) {
        const result = await this.messages.countDocuments({
            receiver: receiver,
            read: false,
        });

        return result;
    }

    /**
     * Modify a message
     * @param {string} id ID of the message
     * @param {function} modifierFunction the function that modifies the message
     * @async
     */
    async modifyMessage(id, modifierFunction) {
        const result = await this.messages.findOne({ id: id });

        await this.messages.updateOne({ id: id }, modifierFunction(result));
    }

    /**
     * Mark a message as read
     * @param {string} id ID of the message
     * @param {boolean} read Toggle between read and not read
     */
    async markMessageAsRead(id, read) {
        await this.messages.updateOne({ id: id }, { $set: { read: read } });
    }

    async messageExists(id) {
        const result = await this.messages.findOne({ id: id });

        return result ? true : false;
    }

    /**
     * Mark all messages sent to a user as read
     * @param {string} receiver ID of the person receiving the messages
     */
    async markAllMessagesAsRead(receiver) {
        await this.messages.updateMany(
            { receiver: receiver },
            { $set: { read: true } },
        );
    }

    /**
     * Delete a message
     * @param {string} id ID of the message
     * @async
     */
    async deleteMessage(id) {
        await this.messages.deleteOne({ id: id });
    }

    /**
     * Check if a message is disputable
     * @param {string} id ID of the message
     * @returns {Promise<boolean>} True if the message is disputable, false if not
     */
    async isMessageDisputable(id) {
        const result = await this.messages.findOne({ id: id });

        return result.disputable;
    }

    /**
     * Dispute a message
     * @param {string} id ID of the message
     * @param {string} dispute The dispute
     */
    async dispute(id, dispute) {
        await this.messages.updateOne(
            { id: id },
            { $set: { dispute: dispute, disputable: false } },
        );

        // to respond to a dispute you just send another message
    }

    /**
     * Check if a project exists
     * @param {string} id ID of the project
     * @returns {Promise<boolean>} True if the project exists, false if not
     * @async
     */
    async projectExists(id, nonPublic) {
        const result = nonPublic
            ? await this.projects.findOne({ id: String(id) })
            : await this.projects.findOne({ id: String(id), public: true });

        return result ? true : false;
    }

    /**
     * Check for illegal wording on text
     * @param {string} text The text to check for illegal wording
     * @returns {Promise<string>} Empty if there is nothing illegal, not empty if it was triggered (returns the trigger)
     * @async
     */
    async checkForIllegalWording(text) {
        let illegalWords = (
            await this.illegalList.findOne({ id: "illegalWords" })
        ).items;
        let illegalWebsites = (
            await this.illegalList.findOne({ id: "illegalWebsites" })
        ).items;
        let spacedOutWordsOnly = (
            await this.illegalList.findOne({ id: "spacedOutWordsOnly" })
        ).items;

        illegalWords = illegalWords ? illegalWords : [];
        illegalWebsites = illegalWebsites ? illegalWebsites : [];
        spacedOutWordsOnly = spacedOutWordsOnly ? spacedOutWordsOnly : [];

        const joined = illegalWords.concat(illegalWebsites);

        const no_spaces = text.replace(REMOVE_SYMBOLS_REGEX, "");

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
     * Check for illegal wording on a username
     * @param {string} username The username to check for illegal wording
     * @returns {Promise<string>} Empty if there is nothing illegal, not empty if it was triggered (returns the trigger)
     * @async
     */
    async checkForUnsafeUsername(username) {
        const basicTrigger = await this.checkForIllegalWording(username);
        if (basicTrigger) return basicTrigger;

        let unsafeUsernames = (
            await this.illegalList.findOne({ id: "unsafeUsernames" })
        ).items;

        unsafeUsernames = unsafeUsernames || [];

        const no_spaces = username.replace(REMOVE_SYMBOLS_REGEX, "");

        for (const item of unsafeUsernames) {
            if (no_spaces.includes(item)) {
                return item;
            }
        }

        return "";
    }

    /**
     * Get the index of illegal wording
     * @param {string} username Username to get the index from
     * @returns {Promise<number>} Index of the illegal wording
     */
    async getIndexOfUnsafeUsername(username) {
        // TODO! make this work better
        const normalWording = await this.getIndexOfIllegalWording(username);
        if (normalWording[0] != -1) return normalWording;

        const unsafeUsernames = (
            await this.illegalList.findOne({ id: "unsafeUsernames" })
        ).items;

        const no_spaces = username.replace(REMOVE_SYMBOLS_REGEX, "");

        for (const item of unsafeUsernames) {
            const index = no_spaces.indexOf(item);
            if (index + 1) {
                return [index, index + item.length];
            }
        }

        return [-1, -1];
    }

    /**
     * Check for potentially illegal wording on text
     * @param {string} text The text to check for slightly illegal wording
     * @returns {Promise<string>} same as normal illegal
     * @async
     */
    async checkForPotentiallyUnsafeUsername(text) {
        let potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        let potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;

        potentiallyUnsafeWords = potentiallyUnsafeWords
            ? potentiallyUnsafeWords
            : [];
        potentiallyUnsafeWordsSpacedOut = potentiallyUnsafeWordsSpacedOut
            ? potentiallyUnsafeWordsSpacedOut
            : [];

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
     * Get the index of potentially unsafe username
     * @param {string} username Username to get the index from
     * @returns {Promise<number>} Index of the potentially unsafe wording
     */
    async getIndexOfPotentiallyUnsafeUsername(username) {
        // TODO: make this work better/correctly

        const potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        const potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;
        const joined = potentiallyUnsafeWords.concat(
            potentiallyUnsafeWordsSpacedOut,
        );

        for (const item of joined) {
            const index = username.indexOf(item);
            if (index + 1) {
                return [index, index + item.length];
            }
        }

        return [-1, -1];
    }

    /**
     * Check for potentially illegal wording on text
     * @param {string} text The text to check for slightly illegal wording
     * @returns {Promise<string>} same as normal illegal
     * @async
     */
    async checkForPotentiallyIllegalWording(text) {
        let potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        let potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;

        potentiallyUnsafeWords = potentiallyUnsafeWords
            ? potentiallyUnsafeWords
            : [];
        potentiallyUnsafeWordsSpacedOut = potentiallyUnsafeWordsSpacedOut
            ? potentiallyUnsafeWordsSpacedOut
            : [];

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
     * Get the index of illegal wording
     * @param {string} text Text to get the index from
     * @returns {Promise<number>} Index of the illegal wording
     */
    async getIndexOfIllegalWording(text) {
        // TODO! make this work better
        const illegalWords = (
            await this.illegalList.findOne({ id: "illegalWords" })
        ).items;
        const illegalWebsites = (
            await this.illegalList.findOne({ id: "illegalWebsites" })
        ).items;
        const spacedOutWordsOnly = (
            await this.illegalList.findOne({ id: "spacedOutWordsOnly" })
        ).items;
        const joined = illegalWords.concat(illegalWebsites);

        const no_spaces = text.replace(REMOVE_SYMBOLS_REGEX, "");

        for (const item of joined) {
            const index = no_spaces.indexOf(item);
            if (index + 1) {
                return [index, index + item.length];
            }
        }

        for (const item of spacedOutWordsOnly) {
            const with_spaces = " " + item + " ";
            const index = text.indexOf(with_spaces);
            if (index + 1) {
                return [index, index + item.length];
            }
        }

        return [-1, -1];
    }

    /**
     * Check for potentially illegal wording on text
     * @param {string} text The text to check for slightly illegal wording
     * @returns {Promise<string>} same as normal illegal
     * @async
     */
    async checkForPotentiallyIllegalWording(text) {
        let potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        let potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;

        potentiallyUnsafeWords = potentiallyUnsafeWords
            ? potentiallyUnsafeWords
            : [];
        potentiallyUnsafeWordsSpacedOut = potentiallyUnsafeWordsSpacedOut
            ? potentiallyUnsafeWordsSpacedOut
            : [];

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
    async getIndexOfPotentiallyIllegalWording(text) {
        // TODO: make this work better/correctly

        const potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        const potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;
        const joined = potentiallyUnsafeWords.concat(
            potentiallyUnsafeWordsSpacedOut,
        );

        for (const item of joined) {
            const index = text.indexOf(item);
            if (index + 1) {
                return [index, index + item.length];
            }
        }

        return [-1, -1];
    }

    /**
     * Set a new list of illegal words
     * @param {Array<string>} words The new list of illegal words
     * @param {string} type The type of the illegal item
     * @async
     */
    async setIllegalWords(type, words) {
        await this.illegalList.updateOne(
            { id: type },
            { $set: { items: words } },
        );
    }

    /**
     * Add an illegal word
     * @param {string} word The item to add
     * @param {string} type The type of the illegal item
     * @async
     */
    async addIllegalWord(word, type) {
        await this.illegalList.updateOne(
            { id: type },
            { $push: { items: word } },
        );
    }

    /**
     * Remove an illegal word
     * @param {string} word The item to remove
     * @param {string} type The type of the illegal item
     * @async
     */
    async removeIllegalWord(word, type) {
        await this.illegalList.updateOne(
            { id: type },
            { $pull: { items: word } },
        );
    }

    /**
     * Get all illegal words
     * @returns {Promise<Object>} Object containing all the illegal words
     * @async
     */
    async getIllegalWords() {
        const illegalWords = (
            await this.illegalList.findOne({ id: "illegalWords" })
        ).items;
        const illegalWebsites = (
            await this.illegalList.findOne({ id: "illegalWebsites" })
        ).items;
        const spacedOutWordsOnly = (
            await this.illegalList.findOne({ id: "spacedOutWordsOnly" })
        ).items;
        const potentiallyUnsafeWords = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeWords" })
        ).items;
        const potentiallyUnsafeWordsSpacedOut = (
            await this.illegalList.findOne({
                id: "potentiallyUnsafeWordsSpacedOut",
            })
        ).items;
        const legalExtensions = await this.getLegalExtensions();
        const unsafeUsernames = (
            await this.illegalList.findOne({ id: "unsafeUsernames" })
        ).items;
        const potentiallyUnsafeUsernames = (
            await this.illegalList.findOne({ id: "potentiallyUnsafeUsernames" })
        ).items;

        return {
            illegalWords,
            illegalWebsites,
            spacedOutWordsOnly,
            potentiallyUnsafeWords,
            potentiallyUnsafeWordsSpacedOut,
            legalExtensions,
            unsafeUsernames,
            potentiallyUnsafeUsernames,
        };
    }

    /**
     * Verify the state from an OAuth2 request
     * @param {string} state The state to verify
     * @returns {Promise<boolean>} True if the state is valid, false if not
     * @async
     */
    async verifyOAuth2State(state) {
        const result = await this.oauthStates.findOne({
            state: state,
            expireAt: { $gt: Date.now() },
        });

        // now get rid of the state cuz uh we dont need it anymore

        if (result) await this.oauthStates.deleteOne({ state: state });

        return result ? true : false;
    }

    /**
     * Generate a new OAuth2 state and save it for verification
     * @returns {Promise<string>} The state
     */
    async generateOAuth2State(extra = "") {
        const state = (randomBytes(32).toString("base64") + extra).replaceAll(
            "+",
            "-",
        );

        await this.oauthStates.insertOne({
            state: state,
            expireAt: Date.now() + 1000 * 60 * 5,
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
                    response = await fetch(
                        `https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/tokens`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                                client_id: Number(
                                    process.env.ScratchOAuthClientID,
                                ),
                                client_secret:
                                    process.env.ScratchOAuthClientSecret,
                                code: code,
                                scopes: ["identify"],
                            }),
                        },
                    ).then((res) => res.json());
                    return response;
                case "github":
                    response = await fetch(
                        `https://github.com/login/oauth/access_token`,
                        {
                            method: "POST",
                            headers: {
                                "Content-Type": "application/json",
                                Accept: "application/json",
                            },
                            body: JSON.stringify({
                                client_id: process.env.GithubOAuthClientID,
                                client_secret:
                                    process.env.GithubOAuthClientSecret,
                                code: code,
                            }),
                        },
                    ).then((res) => res.json());
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
                } catch (e) {
                    console.error("it broke", data, e);
                    throw e;
                }
                id = data.id;
                break;
        }

        let n = 0;
        let orig_username = username;
        while (await this.existsByUsername(username)) {
            username = `${orig_username}${n}`;
            n++;
        }

        const info = await this.createAccount(
            username,
            real_username,
            null,
            null,
            null,
            null,
            false,
            utils,
            res,
        );
        const token = info[0];
        const pm_id = info[1];

        await this.addOAuthMethod(username, method, id);
        return { token, username, id: pm_id };
    }

    /**
     * Set the legal extensions
     * @param {Array<string>} extensions Array of extension IDs to set the legal list to
     */
    async setLegalExtensions(extensions) {
        await this.illegalList.updateOne(
            { id: "legalExtensions" },
            { $set: { items: extensions } },
        );
    }

    /**
     * Add an extension to the legal list
     * @param {string} extension Extension ID
     */
    async addLegalExlegalExtentension(extension) {
        await this.illegalList.updateOne(
            { id: "legalExtensions" },
            { $push: { items: extension } },
        );
    }

    /**
     * Remove an extension from the legal list
     * @param {string} extension Extension ID
     */
    async removeLegalExtension(extension) {
        await this.illegalList.updateOne(
            { id: "legalExtensions" },
            { $pull: { items: extension } },
        );
    }

    async getLegalExtensions() {
        const result = await this.illegalList.findOne({
            id: "legalExtensions",
        });

        return result.items;
    }

    /**
     * Check if an extension is allowed
     * @param {string} extension The extension to check
     * @returns {Promise<boolean>} True if the extension is allowed, false if not
     */
    async checkExtensionIsAllowed(extension) {
        if (!extension) return true;

        const extensionsConfig = await this.illegalList.findOne({
            id: "legalExtensions",
        });
        const isIncluded = extensionsConfig.items.includes(extension);

        return isIncluded;
    }
    async validateAreProjectExtensionsAllowed(
        extensions,
        extensionURLs,
        username,
    ) {
        const isAdmin = await this.isAdmin(username);
        const isModerator = await this.isModerator(username);

        // Note, this does make the above function useless. Not sure if there's any need to keep it yet.
        const extensionsConfig = await this.illegalList.findOne({
            id: "legalExtensions",
        });

        // check the extensions
        const userRank = await this.getRank(username);
        if (userRank < 1 && !isAdmin && !isModerator) {
            const isUrlExtension = (extId) => {
                if (!extensionURLs) return false;
                return extId in extensionURLs;
            };

            if (extensions && !isAdmin && !isModerator) {
                for (let extension of extensions) {
                    if (isUrlExtension(extension)) {
                        // url extension names can be faked (if not trusted source)
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

        await this.users.updateOne(
            { username: username },
            { $set: { token: token, lastLogin: Date.now() } },
        );

        return token;
    }

    /**
     * Search project names/instructions/notes by query
     * @param {boolean} show_unranked Show unranked users
     * @param {string} query Query to search for
     * @param {number} page Page of projects to get
     * @param {number} pageSize Amount of projects to get
     * @param {boolean} reverse Reverse the results
     * @returns {Promise<Array<object>>} Array of projects
     */
    async searchProjects(
        show_unranked,
        query,
        type,
        page,
        pageSize,
        maxPageSize,
        reverse = false,
    ) {
        let aggregateList = [
            {
                $match: {
                    softRejected: false,
                    hardReject: false,
                    public: true,
                },
            },
        ];

        const rev = reverse ? -1 : 1;

        function escapeRegex(input) {
            return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        aggregateList.push({
            $match: {
                $or: [
                    {
                        title: {
                            $regex: `.*${escapeRegex(query)}.*`,
                            $options: "i",
                        },
                    },
                    {
                        instructions: {
                            $regex: `.*${escapeRegex(query)}.*`,
                            $options: "i",
                        },
                    },
                    {
                        notes: {
                            $regex: `.*${escapeRegex(query)}.*`,
                            $options: "i",
                        },
                    },
                ],
            },
        });

        switch (type) {
            case "featured":
                aggregateList.push(
                    {
                        $match: { featured: true },
                    },
                    {
                        $sort: { date: -1 * rev },
                    },
                );
                break;
            case "newest":
                aggregateList.push({
                    $sort: { lastUpdate: -1 * rev },
                });
                break;
            default:
            case "views":
                aggregateList.push({
                    $sort: { views: -1 * rev },
                });
                break;
            case "loves":
                // collect likes
                aggregateList.push(
                    // top ones are gonna have most views, so lets just get top of those first
                    {
                        $sort: { views: -1 * rev },
                    },
                    {
                        $skip: page * pageSize,
                    },
                    {
                        $limit: maxPageSize,
                    },
                    {
                        $lookup: {
                            from: "projectStats",
                            localField: "id",
                            foreignField: "projectId",
                            as: "projectStatsData",
                        },
                    },
                    {
                        $addFields: {
                            loves: {
                                $size: {
                                    $filter: {
                                        input: "$projectStatsData",
                                        as: "stat",
                                        cond: { $eq: ["$$stat.type", "love"] },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $sort: { loves: -1 * rev },
                    },
                );
                break;
            case "votes":
                aggregateList.push(
                    {
                        $sort: { views: -1 * rev },
                    },
                    {
                        $skip: page * pageSize,
                    },
                    {
                        $limit: maxPageSize,
                    },
                    {
                        $lookup: {
                            from: "projectStats",
                            localField: "id",
                            foreignField: "projectId",
                            as: "projectStatsData",
                        },
                    },
                    {
                        $addFields: {
                            votes: {
                                $size: {
                                    $filter: {
                                        input: "$projectStatsData",
                                        as: "stat",
                                        cond: { $eq: ["$$stat.type", "vote"] },
                                    },
                                },
                            },
                        },
                    },
                    {
                        $sort: { votes: -1 * rev },
                    },
                );
                break;
        }

        if (!show_unranked) {
            aggregateList.push(
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    // only allow ranked users to show up
                    $match: { "authorInfo.rank": { $gt: 0 } },
                },
            );
        }

        aggregateList.push(
            {
                $skip: page * pageSize,
            },
            {
                $limit: pageSize,
            },
        );

        if (show_unranked) {
            aggregateList.push({
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo",
                },
            });
        }

        aggregateList.push(
            {
                // set author to { id: old_.author, username: authorInfo.username }
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                    fromDonator: {
                        $in: ["donator", "$authorInfo.badges"],
                    },
                },
            },
            {
                $unset: ["projectStatsData", "_id", "authorInfo"],
            },
        );

        const result = await this.projects.aggregate(aggregateList).toArray();

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
            return input.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        }

        const result = await this.users
            .aggregate([
                {
                    $match: {
                        permBanned: false,
                        username: {
                            $regex: `.*${escapeRegex(query)}.*`,
                            $options: "i",
                        },
                    },
                },
                {
                    $sort: { followers: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                // turn all the data into just {username, id}
                {
                    $project: {
                        username: true,
                        id: true,
                    },
                },
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
     * @returns {Promise<Array<Object>>} Array of projects
     */
    async specializedSearch(query, page, pageSize, maxPageSize) {
        let pipeline = [
            {
                $sort: { lastUpdate: -1 },
            },
            {
                $skip: page * pageSize,
            },
            {
                $limit: maxPageSize,
            },
            ...query,
            {
                $limit: pageSize,
            },
            {
                $lookup: {
                    from: "users",
                    localField: "author",
                    foreignField: "id",
                    as: "authorInfo",
                },
            },
            {
                $addFields: {
                    author: {
                        id: "$author",
                        username: { $arrayElemAt: ["$authorInfo.username", 0] },
                    },
                },
            },
            {
                $unset: ["authorInfo", "_id"],
            },
        ];

        const aggResult = await this.projects.aggregate(pipeline).toArray();

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

    async almostFeatured(page, pageSize, maxPageSize) {
        const result = await this.projects
            .aggregate([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                        featured: false,
                        noFeature: { $ne: true },
                    },
                },
                {
                    $sort: { views: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: Math.min(maxPageSize, pageSize * 2),
                },
                {
                    $lookup: {
                        from: "projectStats",
                        localField: "id",
                        foreignField: "projectId",
                        as: "projectStatsData",
                    },
                },
                {
                    $addFields: {
                        votes: {
                            $size: {
                                $filter: {
                                    input: "$projectStatsData",
                                    as: "stat",
                                    cond: { $eq: ["$$stat.type", "vote"] },
                                },
                            },
                        },
                    },
                },
                {
                    $sort: { votes: -1 },
                },
                {
                    $limit: pageSize,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    // set author to { id: old_.author, username: authorInfo.username }
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                        fromDonator: {
                            $in: ["donator", "$authorInfo.badges"],
                        },
                    },
                },
                {
                    $unset: ["projectStatsData", "_id", "authorInfo"],
                },
            ])
            .toArray();

        return result;
    }

    async mostLiked(page, pageSize, maxPageSize) {
        const time_after = Date.now() - 1000 * 60 * 60 * 24 * 14;
        const result = await this.projects
            .aggregate([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                        featured: false,
                        date: { $gt: time_after },
                    },
                },
                {
                    $sort: { views: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: maxPageSize * 3,
                },
                {
                    $lookup: {
                        from: "projectStats",
                        localField: "id",
                        foreignField: "projectId",
                        as: "projectStatsData",
                    },
                },
                {
                    $addFields: {
                        loves: {
                            $size: {
                                $filter: {
                                    input: "$projectStatsData",
                                    as: "stat",
                                    cond: { $eq: ["$$stat.type", "love"] },
                                },
                            },
                        },
                    },
                },
                {
                    $sort: { loves: -1 },
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    // only allow ranked users to show up
                    $match: { "authorInfo.rank": { $gt: 0 } },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    // set author to { id: old_.author, username: authorInfo.username }
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $unset: ["projectStatsData", "_id", "authorInfo"],
                },
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
        await this.projects.updateOne(
            { id: id },
            { $set: { softRejected: toggle } },
        );
    }

    /**
     * Check if a project is soft rejected
     * @param {string} id ID of the project
     * @returns {Promise<boolean>}
     */
    async isSoftRejected(id) {
        const result = await this.projects.findOne({ id: id });

        return result.softRejected;
    }

    /**
     * Set a project to private/not private
     * @param {string} id ID of the project
     * @param {boolean} toggle True if making private, false if not
     */
    async privateProject(id, toggle) {
        await this.projects.updateOne(
            { id: id },
            { $set: { public: !toggle } },
        );
    }

    async getAllFollowing(id, page, pageSize) {
        const result = await this.followers
            .aggregate([
                {
                    $match: { follower: id, active: true },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "target",
                        foreignField: "id",
                        as: "userInfo",
                    },
                },
                {
                    $addFields: {
                        username: { $arrayElemAt: ["$userInfo.username", 0] },
                        // target
                        id: "$target",
                    },
                },
                {
                    $project: {
                        username: true,
                        id: true,
                        _id: false,
                    },
                },
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
        const followers = await this.getAllFollowing(
            id,
            0,
            Number(process.env.MaxPageSize || 0),
        );

        const feed = await this.userFeed
            .aggregate([
                {
                    $match: { userID: { $in: followers.map((x) => x.id) } }, //, expireAt: { $gt: Date.now() } }
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $limit: size,
                },
                {
                    $lookup: {
                        from: "users",
                        localField: "userID",
                        foreignField: "id",
                        as: "userInfo",
                    },
                },
                {
                    $addFields: {
                        username: { $arrayElemAt: ["$userInfo.username", 0] },
                        id: "$userID",
                    },
                },
                {
                    $unset: ["_id", "userInfo", "userID"],
                },
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
            expireAt: Date.now() + Number(process.env.FeedExpirationTime),
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

        if (!buffer) return false;

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

    compMemUsage() {
        const total = os.totalmem();
        const free = os.freemem();
        const used = total - free;
        const precentage_used = used / total;
        return {
            total,
            free,
            used,
            precentage_used,
        };
    }
    async getStats() {
        const userCount =
            (await this.users.countDocuments({ permBanned: false })) || 0; // dont count perm banned users :tongue:
        const bannedCount =
            (await this.users.countDocuments({
                $or: [{ permBanned: true }, { unbanTime: { $gt: Date.now() } }],
            })) || 0;
        const projectCount = (await this.projects.countDocuments()) || 0;
        // check if remix is not 0
        const remixCount =
            (await this.projects.countDocuments({ remix: { $ne: "0" } })) || 0;
        const featuredCount =
            (await this.projects.countDocuments({ featured: true })) || 0;
        const totalViewsResult = await this.projects
            .aggregate([
                { $match: { views: { $gte: 0 } } },
                { $group: { _id: null, total_views: { $sum: "$views" } } },
            ])
            .toArray();
        const totalViews =
            totalViewsResult.length > 0
                ? totalViewsResult[0].total_views || 0
                : 0;

        /*
        const mongodb_stats = await this.db.command({
            serverStatus: 1,
        });
        const current_mem_usage = process.memoryUsage();
        const comp_mem_usage = this.compMemUsage();
        */

        return {
            userCount,
            bannedCount,
            projectCount,
            remixCount,
            featuredCount,
            totalViews,
            /*
            current_mem_usage,
            comp_mem_usage,
            mongodb_stats,
            */
        };
    }

    async markPrivacyPolicyAsRead(username) {
        await this.users.updateOne(
            { username: username },
            { $set: { lastPrivacyPolicyRead: Date.now() } },
        );
    }

    async markTOSAsRead(username) {
        await this.users.updateOne(
            { username: username },
            { $set: { lastTOSRead: Date.now() } },
        );
    }

    async markGuidelinesAsRead(username) {
        await this.users.updateOne(
            { username: username },
            { $set: { lastGuidelinesRead: Date.now() } },
        );
    }

    async getLastPolicyRead(username) {
        const result = await this.users.findOne({ username: username });

        return {
            privacyPolicy: result.lastPrivacyPolicyRead,
            TOS: result.lastTOSRead,
            guidelines: result.lastGuidelinesRead,
        };
    }

    async getLastPolicyUpdate() {
        const out = {};

        (await this.lastPolicyUpdates.find().toArray()).map((x) => {
            out[x.id] = x.lastUpdate;
        });

        return out;
    }

    async setLastPrivacyPolicyUpdate() {
        await this.lastPolicyUpdates.updateOne(
            { id: "privacyPolicy" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async setLastTOSUpdate() {
        await this.lastPolicyUpdates.updateOne(
            { id: "TOS" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async setLastGuidelinesUpdate() {
        await this.lastPolicyUpdates.updateOne(
            { id: "guidelines" },
            { $set: { lastUpdate: Date.now() } },
        );
    }

    async getRuntimeConfigItem(id) {
        const result = await this.runtimeConfig.findOne({ id: id });

        if (!result) {
            console.log(`Couldn't find config item ${id}`);
            return true; // minimize disruptions
        }

        return result.value;
    }

    async setRuntimeConfigItem(id, value) {
        await this.runtimeConfig.updateOne(
            { id: id },
            { $set: { value: value } },
        );
    }

    async isPrivateProfile(username) {
        const result = await this.users.findOne({ username: username });

        return result.privateProfile;
    }

    async setPrivateProfile(username, toggle) {
        await this.users.updateOne(
            { username: username },
            { $set: { privateProfile: toggle } },
        );
    }

    async canFollowingSeeProfile(username) {
        const result = await this.users.findOne({ username: username });

        return result.allowFollowingView;
    }

    async setFollowingSeeProfile(username, toggle) {
        await this.users.updateOne(
            { username: username },
            { $set: { allowFollowingView: toggle } },
        );
    }

    /**
     * Temporarily ban a user
     * @param {string} username Username of the user
     * @param {string} reason Reason for temp ban
     * @param {number} length Length of ban in milliseconds
     * @returns {Promise<void>}
     */
    async tempBanUser(username, reason, length) {
        await this.users.updateOne(
            { username: username },
            { $set: { banReason: reason, unbanTime: Date.now() + length } },
        );
    }

    async unTempBan(username) {
        await this.users.updateOne(
            { username: username },
            { $set: { unbanTime: 0 } },
        );
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
     * Connect an ip to an account
     * @param {string} username Username of the user
     * @param {string} ip Ip they logged in with
     * @returns {Promise<>}
     */
    async addIP(username, ip) {
        const id = await this.getIDByUsername(username);

        await this.loggedIPs.updateOne(
            { id: id, ip: ip }, // match condition
            {
                $set: { lastLogin: Date.now() },
                $setOnInsert: {
                    banned: false,
                },
            },
            { upsert: true },
        );
    }

    /**
     * Connect an ip to an account
     * @param {string} id ID of the user
     * @param {string} ip Ip they logged in with
     * @returns {Promise<>}
     */
    async addIPID(id, ip) {
        await this.loggedIPs.updateOne(
            { id: id, ip: ip }, // match condition
            {
                $set: { lastLogin: Date.now() },
                $setOnInsert: {
                    banned: false,
                },
            },
            { upsert: true },
        );
    }

    async getIPs(username) {
        const id = await this.getIDByUsername(username);

        return await this.getIpsByID(id);
    }

    async getIpsByID(id) {
        const ips = (await this.loggedIPs.find({ id: id }).toArray()).map(
            (x) => {
                return {
                    ip: x.ip,
                    banned: x.banned,
                    lastLogin: x.lastLogin,
                };
            },
        );

        return ips;
    }

    async isIPBanned(ip) {
        const result = await this.loggedIPs.findOne({ ip: ip });

        if (!result) return false;

        return result.banned;
    }

    async banIP(ip, toggle) {
        await this.loggedIPs.updateMany(
            { ip: ip },
            { $set: { banned: toggle } },
        );

        if (toggle) {
            // ban all accounts with this ip
            const accounts = await this.loggedIPs.find({ ip: ip }).toArray();
            for (const account of accounts) {
                await this.setPermBanned(
                    await this.getUsernameByID(account.id),
                    true,
                    "IP banned",
                    true,
                );
            }
        }
    }

    async banUserIP(username, toggle) {
        const id = await this.getIDByUsername(username);

        await this.loggedIPs.updateMany(
            { id: id },
            { $set: { banned: toggle } },
        );

        if (toggle) {
            // ban all accounts with the same ip
            const ips = await this.getIPs(username);

            for (const ip of ips) {
                // find all accounts with this ip
                const accounts = await this.loggedIPs
                    .find({ ip: ip.ip })
                    .toArray();

                for (const account of accounts) {
                    await this.setPermBanned(
                        await this.getUsernameByID(account.id),
                        true,
                        "IP banned",
                        true,
                    );
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
                username: await this.getUsernameByID(account.id),
            });
        }

        return final;
    }

    async isEmailVerified(username) {
        const result = await this.users.findOne({ username: username });

        return result.emailVerified;
    }

    async setEmailVerified(username, toggle) {
        await this.users.updateOne(
            { username: username },
            { $set: { emailVerified: toggle } },
        );
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
        const result = await this.sentEmails.countDocuments({
            expireAt: { $gt: Date.now() },
        });

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
    async sendEmail(
        userid,
        userip,
        type,
        email,
        name,
        subject,
        message,
        messageHtml,
    ) {
        if ((await this.getEmailCount()) > process.env.EmailLimit) return false;

        await this.sentEmails.insertOne({
            userid,
            userip,
            sentAt: Date.now(),
            expireAt: Date.now() + Number(process.env.LinkExpire) * 60 * 1000,
            type,
        });

        /*/
         * Send email
         * with node-mailjet
         * if it fails return false
        /*/

        const mailjet = new Mailjet({
            apiKey: process.env.MJApiKeyPublic,
            apiSecret: process.env.MJApiKeyPrivate,
        });

        try {
            await mailjet.post("send", { version: "v3.1" }).request({
                Messages: [
                    {
                        From: {
                            Email: "no-reply@penguinmod.com",
                            Name: "PenguinMod",
                        },
                        To: [
                            {
                                Email: email,
                                Name: name,
                            },
                        ],
                        Subject: subject,
                        TextPart: message,
                        HTMLPart: messageHtml,
                    },
                ],
            });
        } catch (e) {
            console.log("mail error", e);
            return false;
        }

        return true;
    }

    async lastEmailSentByID(userid) {
        const result = (
            await this.sentEmails
                .aggregate([
                    {
                        $match: { userid },
                    },
                    {
                        $sort: { sentAt: -1 },
                    },
                    {
                        $limit: 1,
                    },
                ])
                .toArray()
        )[0];

        if (!result) return 0;

        return result.sentAt;
    }

    async lastEmailSentByIP(userip) {
        const result = (
            await this.sentEmails
                .aggregate([
                    {
                        $match: { userip },
                    },
                    {
                        $sort: { sentAt: -1 },
                    },
                    {
                        $limit: 1,
                    },
                ])
                .toArray()
        )[0];

        if (!result) return 0;

        return result.sentAt;
    }

    async generatePasswordResetState(email, is_verify_email = false) {
        const state =
            randomBytes(32).toString("hex") + (is_verify_email ? "_VE" : "");

        await this.passwordResetStates.insertOne({
            state: state,
            email: email,
            expireAt: Date.now() + Number(process.env.LinkExpire) * 60 * 1000,
        });

        return state;
    }

    async verifyPasswordResetState(state, email, is_verify_email = false) {
        console.log(is_verify_email);
        if (state.endsWith("_VE") != is_verify_email) return false;

        const result = await this.passwordResetStates.findOne({
            state: state,
            email: email,
            expireAt: {
                $gt: Date.now() + Number(process.env.LinkExpire) * 1000 * 60,
            },
        });

        const is_valid = !!result;

        console.log("IS VALID:");
        console.log(is_valid);

        console.log("EXPIRES AT:");
        console.log(Date.now() + Number(process.env.LinkExpire) * 1000 * 60);

        if (is_valid)
            await this.passwordResetStates.deleteOne({ state: state });

        return is_valid;
    }

    /**
     * Gets arbitrary customization data, meant for donators to customize their profile.
     * @param {string} username The user with the customization data
     * @returns {Object} Arbitrary keys and values
     */
    async getUserCustomization(username) {
        const result = await this.accountCustomization.findOne({
            username: username,
        });
        if (!result) return {};
        return result.customData || {};
    }
    async getUserCustomizationDisabled(username) {
        const result = await this.accountCustomization.findOne({
            username: username,
        });
        if (!result) return false;
        return result.disabled === true;
    }

    /**
     * User customization is arbitrary customization data, meant for donators to customize their profile.
     * This function checks whether or not the arbitrary data fits our requirements
     * @param {Object} customData Arbitrary keys and values
     * @returns {null|string} `null` if the customData is valid, and a string containing the error reason if the customData is invalid.
     */
    verifyCustomData(customData) {
        if (typeof customData !== "object" || Array.isArray(customData))
            return "DataNotObject";
        const allowedTypes = ["string", "number", "boolean", "object"]; // object is specified but we actually only allow Arrays
        const allowedArrayValueTypes = ["string", "number", "boolean"]; // since we allow arrays, we only allow some types in those arrays

        // block too much stuff and also reserve stuff incase we have some weird reason to use it later
        const keys = Object.keys(customData);
        const values = Object.values(customData);
        if (keys.length > 64) return "TooManyKeys";
        if (keys.some((key) => key.startsWith("_") || key.length > 64))
            return "InvalidKeyName";

        // block values
        const areValuesInvalid = values.some(
            (value) =>
                !allowedTypes.includes(typeof value) || // type isnt allowed
                (typeof value === "string" && value.length > 256) || // string > 256 chars not allowed
                (typeof value === "object" && !Array.isArray(value)),
        ); // if we are an object, block if we arent an array
        if (areValuesInvalid) return "InvalidValueFound";

        // block arrays specified
        const arrayValues = values.filter(
            (value) => typeof value === "object" && Array.isArray(value),
        );
        if (arrayValues.length > 4) return "TooManyArrays";

        // each array specified adds its amount of items to a total, and that total cannot exceed a certain amount
        const mixedArrays = arrayValues.flat(); // makes each array into 1 array
        if (mixedArrays.length > 64) return "TooManyValuesTotalWithinAllArrays";

        const areArrayValuesInvalid = mixedArrays.some(
            (value) =>
                !allowedArrayValueTypes.includes(typeof value) || // type isnt allowed
                (typeof value === "string" && value.length > 64),
        ); // string > 64 chars not allowed
        if (areArrayValuesInvalid) return "InvalidValueWithinArrayFound";

        return null;
    }

    /**
     * Sets arbitrary customization data, meant for donators to customize their profile.
     * Any endpoint that exposes this functionality to regular users should also make sure `verifyCustomData` does not give an error reason.
     * @param {string} username The user to set the customization data for
     * @param {Object} customData Arbitrary keys and values
     */
    async setUserCustomization(username, customData) {
        await this.accountCustomization.updateOne(
            { username: username },
            { $set: { customData: customData } },
            { upsert: true },
        );
    }
    async setUserCustomizationDisabled(username, disabled) {
        await this.accountCustomization.updateOne(
            { username: username },
            { $set: { disabled: disabled } },
            { upsert: true },
        );
    }

    async clearAllEmails() {
        await this.sentEmails.deleteMany({});
    }

    async massBanByUsername(regex, toggle, reason = "Banned by staff") {
        const users = await this.users
            .find({ username: { $regex: regex } })
            .toArray();
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
                await this.followers.updateOne(
                    { follower: follower.follower, target: id },
                    { $set: { active: false } },
                );
            }
        }

        // count the amount of followers
        const count = await this.followers.countDocuments({
            target: id,
            active: true,
        });

        await this.users.updateOne({ id: id }, { $set: { followers: count } });
    }

    /**
     * Block or unblock a user
     * @param {string} user_id id of the person blocking
     * @param {string} target_id id of the person being blocked
     * @param {boolean} active true if blocking, false if unblocking
     */
    async blockUser(user_id, target_id, active) {
        if (
            await this.blocking.findOne({ blocker: user_id, target: target_id })
        ) {
            await this.blocking.updateOne(
                {
                    blocker: user_id,
                    target: target_id,
                },
                {
                    $set: {
                        active,
                        time: Date.now(),
                    },
                },
            );
            return;
        }

        await this.blocking.insertOne({
            blocker: user_id,
            target: target_id,
            active,
            time: Date.now(),
        });
    }

    /**
     * Check if a user has blocked another user
     * @param {string} user_id id of the person blocking
     * @param {string} target_id id of the person being blocked
     * @returns {Promise<boolean>} true if they're blocked, false if not
     */
    async hasBlocked(user_id, target_id) {
        return !!(await this.blocking.findOne({
            blocker: user_id,
            target: target_id,
            active: true,
        }));
    }

    async renameObjectMinio(bucket, old_key, new_key) {
        try {
            await this.minioClient.copyObject(
                bucket,
                new_key,
                `/${bucket}/${old_key}`,
            );
            await this.minioClient.removeObject(bucket, old_key);
        } catch (err) {
            console.error("Error renaming object:", err);
        }
    }

    /**
     * List objects in a bucket with a certain prefix
     * @param {string} bucket Bucket name
     * @param {string} prefix Prefix to search for
     * @returns {Promise<string[]>}
     */
    async listWithPrefix(bucket, prefix) {
        return new Promise((resolve, reject) => {
            const objectNames = [];

            const stream = this.minioClient.listObjects(bucket, prefix, true); // recursive = true

            stream.on("data", (obj) => {
                objectNames.push(obj.name);
            });

            stream.on("error", (err) => {
                reject(err);
            });

            stream.on("end", () => {
                resolve(objectNames);
            });
        });
    }

    /**
     * Change a project's id
     * @param {string} original_id The id of the project
     * @param {string} new_id The new id to set
     * @returns {Promise<null>}
     */
    async changeProjectID(original_id, new_id) {
        // first lets change the entry
        await this.projects.updateOne(
            { id: original_id },
            { $set: { id: new_id } },
        );
        // now we need to change the entries in minio
        // minio bucket stuff
        await this.renameObjectMinio("project-thumbnails", original_id, new_id);
        await this.renameObjectMinio("projects", original_id, new_id);

        const search_term = `${original_id}_`;
        const assets = using_backblaze
            ? await this.listWithPrefixBackblaze(search_term)
            : await this.listWithPrefix("project-assets", search_term);
        for (const asset of assets) {
            const asset_id = asset.split("_")[1];

            if (using_backblaze) {
                await this.renameObjectBackblaze(
                    asset,
                    `${new_id}_${asset_id}`,
                );
            } else {
                await this.renameObjectMinio(
                    "project-assets",
                    asset,
                    `${new_id}_${asset_id}`,
                );
            }
        }
        await this.users.updateMany(
            { favoriteProjectID: original_id },
            { $set: { favoriteProjectID: new_id } },
        );
        await this.projectStats.updateMany(
            { projectId: original_id },
            { $set: { projectId: new_id } },
        );
        await this.messages.updateMany(
            { type: "upload", "data.id": original_id },
            { $set: { "data.id": new_id } },
        );
        await this.projects.updateMany(
            { remix: original_id },
            { $set: { remix: new_id } },
        );
    }

    /**
     * Get alts of a user, by ip. NOTE: THIS IS RECURSIVE!!!
     * @param {string} user_id id of the user
     * @returns {Promise<string[]>} ids of the alts
     */
    async getAlts(user_id) {
        const current_ids = new Set();
        await this._getAltsRec(user_id, current_ids);
        return [...current_ids];
    }

    async idListToUsernames(ids) {
        const usernames = (
            await this.users
                .find({
                    id: { $in: ids },
                })
                .toArray()
        ).map((x) => x.username);
        return usernames;
    }

    /**
     * DO NOT USE!!! INTERNAL USE ONLY!!!!
     * @param {string} user_id id of the user
     * @param {Set<string>} current_ids set of the ids already collected
     * @returns {Promise<>}
     */
    async _getAltsRec(user_id, current_ids) {
        if (current_ids.has(user_id)) return;
        current_ids.add(user_id);
        const current_data = await this.getIpsByID(user_id);
        for (const item of current_data) {
            const to_recurse = await this.getAllAccountsWithIP(item.ip);
            for (const user of to_recurse) {
                await this._getAltsRec(user.id, current_ids);
            }
        }
    }

    async getImpressions(project_id) {
        const project = await this.projects.findOne({ id: project_id });
        return project.impressions ? project.impressions : 0;
    }

    async addImpression(project_id) {
        await this.projects.updateOne(
            { id: project_id },
            { $inc: { impressions: 1 } },
        );
    }

    /**
     * Register an interaction. Doesn't need the project since all thats stored is the tags in the project
     * @param {string} user_id ID of the user
     * @param {string} interaction_type The type of the interaction. Currently only "love", "unlove", and "view" are supported
     * @param {string[]} tags an array of the tags
     * @returns {Promise<>}
     */
    async registerInteraction(user_id, interaction_type, tags) {
        let weight;
        switch (interaction_type) {
            case "view":
                weight = 1;
                break;
            case "love":
                weight = 5;
                break;
            case "unlove":
                weight = -5;
                break;
            case "less":
                weight = -25;
                break;
            case "more":
                weight = 25;
            default:
                weight = 0;
                break;
        }

        for (const tag of tags) {
            await this.tagWeights.updateOne(
                {
                    user_id,
                    tag,
                },
                {
                    $inc: { weight },
                    $set: {
                        most_recent: Date.now(),
                    },
                },
                {
                    upsert: true,
                },
            );
        }
    }

    /**
     * Collect tags (#abc) from a string
     * @param {string} text The text
     * @returns {string[]}
     */
    collectTags(text) {
        // i hate regex. but anyways. this gets occurences of a hash followed by non-whitespace characters. ty stackoverflow user
        const res = text.match(/#\w+/g);
        const tags = res ? res.map((t) => t.substring(1)) : [];
        return tags.slice(0, 10); // first 10 tags only
    }

    /**
     * Register a love/unlove of a project.
     * @param {string} user_id ID of the user
     * @param {string} text the text of the project. Usually will be the instructions and notes.
     * @param {boolean} love If its a love or removal of a love. True for love, false for remove.
     * @returns {Promise<>}
     */
    async collectAndInteractLove(user_id, text, love) {
        const tags = this.collectTags(text);

        await this.registerInteraction(user_id, love ? "love" : "unlove", tags);
    }

    /**
     * Register a view of a project.
     * @param {string} user_id ID of the user
     * @param {string} text the text of the project. Usually will be the instructions and notes.
     * @returns {Promise<>}
     */
    async collectAndInteractView(user_id, text) {
        const tags = this.collectTags(text);

        await this.registerInteraction(user_id, "view", tags);
    }

    /**
     * Suggest less of these tags
     * @param {string} user_id ID of the user
     * @param {string} text the text of the project. Usually will be the instructions and notes.
     * @returns {Promise<>}
     */
    async collectAndLess(user_id, text) {
        const tags = this.collectTags(text);

        await this.registerInteraction(user_id, "less", tags);
    }

    /**
     * Suggest more of these tags
     * @param {string} user_id ID of the user
     * @param {string} text the text of the project. Usually will be the instructions and notes.
     * @returns {Promise<>}
     */
    async collectAndMore(user_id, text) {
        const tags = this.collectTags(text);

        await this.registerInteraction(user_id, "more", tags);
    }

    /**
     * Gets the projects suggested for a particular user
     * @param {string} username Username of the user
     * @param {number} page What page you're on
     * @param {number} pageSize How many you want per page
     * @param {number} maxPageSize The max number of projects you want to do heavy operations on
     * @returns {Promise<object[]>} The projects
     */
    async getFYP(username, page, pageSize, maxPageSize) {
        const userId = await this.getIDByUsername(username);

        console.time("top tags & followed authors");
        // get top tags and followed authors in parallel (so we are fast)
        const [topTagsDocs, followedAuthors] = await Promise.all([
            this.tagWeights
                .aggregate([
                    { $match: { user_id: userId } },
                    { $sort: { weight: -1, most_recent: -1 } },
                    { $limit: 10 },
                    { $project: { tag: 1, _id: 0 } },
                ])
                .toArray(),

            this.followers
                .aggregate([
                    { $match: { follower: userId, active: true } },
                    { $project: { _id: 0, target: 1 } },
                ])
                .toArray(),
        ]);

        const topTags = topTagsDocs.map((doc) => doc.tag);
        const followedIds = followedAuthors.map((f) => f.target);
        console.timeEnd("top tags & followed authors");

        console.time("whole scoring");
        const scoredProjects = await this.projects
            .aggregate([
                {
                    $match: {
                        softRejected: false,
                        hardReject: false,
                        public: true,
                        // date filter
                        date: { $gte: Date.now() - 1000 * 60 * 60 * 24 * 90 }, // last 90 days (fyp like tiktok lmao heh...)
                    },
                },
                {
                    $sort: { date: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: maxPageSize,
                },

                // check blocking
                {
                    $lookup: {
                        from: "blocking",
                        let: { authorId: "$author" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$blocker", userId] },
                                            { $eq: ["$target", "$$authorId"] },
                                            { $eq: ["$active", true] },
                                        ],
                                    },
                                },
                            },
                            { $limit: 1 },
                        ],
                        as: "blocked",
                    },
                },
                {
                    $match: { blocked: { $size: 0 } },
                },

                // get love count
                {
                    $lookup: {
                        from: "projectStats",
                        let: { pid: "$id" },
                        pipeline: [
                            {
                                $match: {
                                    $expr: {
                                        $and: [
                                            { $eq: ["$projectId", "$$pid"] },
                                            { $eq: ["$type", "love"] },
                                        ],
                                    },
                                },
                            },
                            { $count: "count" },
                        ],
                        as: "loves",
                    },
                },

                // calculate score (fast frfr)
                // Score: +10 if followed, +2 per top tag match, +love count
                {
                    $addFields: {
                        loveCount: {
                            $ifNull: [{ $arrayElemAt: ["$loves.count", 0] }, 0],
                        },
                        followedAuthor: { $in: ["$author", followedIds] },
                        combinedText: {
                            $concat: [
                                { $ifNull: ["$title", ""] },
                                " ",
                                { $ifNull: ["$instructions", ""] },
                                " ",
                                { $ifNull: ["$notes", ""] },
                            ],
                        },
                    },
                },
                {
                    $addFields: {
                        tagMatches: {
                            $reduce: {
                                input: topTags,
                                initialValue: 0,
                                in: {
                                    $add: [
                                        "$$value",
                                        {
                                            $cond: [
                                                {
                                                    $regexMatch: {
                                                        input: "$combinedText",
                                                        regex: {
                                                            $concat: [
                                                                ".*#",
                                                                "$$this",
                                                                ".*",
                                                            ],
                                                        },
                                                        options: "i",
                                                    },
                                                },
                                                1,
                                                0,
                                            ],
                                        },
                                    ],
                                },
                            },
                        },
                    },
                },
                {
                    $addFields: {
                        score: {
                            $add: [
                                { $cond: ["$followedAuthor", 10, 0] },
                                { $multiply: ["$tagMatches", 2] },
                                "$loveCount",
                            ],
                        },
                    },
                },

                {
                    $sort: { score: -1, date: -1 },
                },
                {
                    $limit: pageSize,
                },

                // collect author data
                {
                    $lookup: {
                        from: "users",
                        localField: "author",
                        foreignField: "id",
                        as: "authorInfo",
                    },
                },
                {
                    $addFields: {
                        author: {
                            id: "$author",
                            username: {
                                $arrayElemAt: ["$authorInfo.username", 0],
                            },
                        },
                    },
                },
                {
                    $project: {
                        _id: 0,
                        authorInfo: 0,
                        blocked: 0,
                        loves: 0,
                        followedAuthor: 0,
                        combinedText: 0,
                        tagMatches: 0,
                        score: 0,
                    },
                },
            ])
            .toArray();
        console.timeEnd("whole scoring");

        return scoredProjects;
    }

    async addImpressionsMany(project_ids) {
        await this.projects.updateMany(
            {
                id: {
                    $in: project_ids,
                },
            },
            { $inc: { impressions: 1 } },
        );
    }

    /**
     * Convert a protobuf file to a json object
     * @param {Uint8Array} protobuf The protobuf file
     * @returns {Object} The project.json
     */
    protobufToProjectJson(protobuf) {
        return pmp_protobuf.protobufToJson(protobuf);
    }

    /**
     * Converts a project.json object to a protobuf file
     * @param {Object} json The project.json
     * @returns {Uint8Array} The protobuf file
     */
    projectJsonToProtobuf(json) {
        return pmp_protobuf.jsonToProtobuf(json);
    }

    async getWorstOffenders(page, pageSize) {
        return await this.performance_logging
            .aggregate([
                {
                    $sort: { millis: -1 },
                },
                {
                    $skip: page * pageSize,
                },
                {
                    $limit: pageSize,
                },
            ])
            .toArray();
    }

    /**
     * Delete a projects thumbnail
     * @param {string} project_id ID of the project
     * @returns {Promise<>}
     */
    async deleteThumb(project_id) {
        const image_buffer = await deleted_thumb_buffer;
        await this.minioClient.putObject(
            "project-thumbnails",
            project_id,
            image_buffer,
        );
    }

    /**
     * Check if a user has mod perms
     * @param {string} username Username
     * @returns {Promise<boolean>} If they have mod perms
     */
    async hasModPerms(username) {
        return !!(await this.users.findOne({
            username,
            $or: [{ moderator: true }, { admin: true }],
        }));
    }

    /**
     * Toggle if a user is on the watchlist or not
     * @param {string} username username of the user
     * @param {boolean} enabled if to enable it or not
     * @returns {Promise<>}
     */
    async toggleWatchlist(username, enabled) {
        await this.users.updateOne(
            { username },
            { $set: { onWatchlist: enabled } },
        );
    }

    /**
     * Check if a user is on the watchlist
     * @param {string} username Username of the user
     * @returns {Promise<boolean>}
     */
    async isOnWatchlist(username) {
        return !!(await this.users.findOne({ username })).onWatchlist;
    }

    async backupAssetCheck(asset_name) {
        // we will use minio here
        const item = await this.readObjectFromBucket(
            "project-assets",
            asset_name,
        );
        if (item) {
            if (using_backblaze) {
                await this.saveToBackblaze(asset_name, item);
            }
        }
        return item;
    }
}

module.exports = UserManager;
