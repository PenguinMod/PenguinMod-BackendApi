require("dotenv").config();
const { MongoClient } = require("mongodb");
const Minio = require("minio");
const Authentication = require("./Authentication");

const using_backblaze = String(process.env.UseBackblaze) === "true";

class DBController {
    async init() {
        // TODO: add more indexes

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
            { createdAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
        this.sentEmails = this.db.collection("sentEmails");
        // await this.sentEmails.dropIndexes();
        await this.sentEmails.dropIndexes();
        await this.sentEmails.createIndex(
            { sentAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
        this.followers = this.db.collection("followers");
        this.oauthIDs = this.db.collection("oauthIDs");
        this.reports = this.db.collection("reports");
        this.runtimeConfig = this.db.collection("runtimeConfig");
        //this.runtimeConfig.deleteMany({});
        if (!(await this.runtimeConfig.findOne({ id: "viewingEnabled" }))) {
            this.runtimeConfig.insertOne({
                id: "viewingEnabled",
                value: String(process.env.ViewingEnabled) === "true",
            });
        }
        if (!(await this.runtimeConfig.findOne({ id: "uploadingEnabled" }))) {
            this.runtimeConfig.insertOne({
                id: "uploadingEnabled",
                value: String(process.env.UploadingEnabled) === "true",
            });
        }
        if (
            !(await this.runtimeConfig.findOne({
                id: "accountCreationEnabled",
            }))
        ) {
            this.runtimeConfig.insertOne({
                id: "accountCreationEnabled",
                value: String(process.env.AccountCreationEnabled) === "true",
            });
        }

        this.projects = this.db.collection("projects");
        // await this.projects.dropIndexes();
        await this.projects.createIndex({
            title: "text",
            instructions: "text",
            notes: "text",
        });
        await this.projects.createIndex({ id: 1 }, { unique: true });
        await this.projects.createIndex({
            lastUpdate: -1,
            views: -1,
            date: -1,
        });
        this.projectStats = this.db.collection("projectStats");
        await this.projectStats.createIndex({ projectId: -1, type: -1 });
        this.messages = this.db.collection("messages");
        await this.messages.createIndex({ receiver: -1, id: -1 });
        await this.messages.createIndex({ "message.previous": 1 });
        this.oauthStates = this.db.collection("oauthStates");
        await this.oauthStates.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 60 * 5 },
        ); // give 5 minutes
        this.oneTimeTkCodes = this.db.collection("ottCodes");
        await this.oneTimeTkCodes.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
        );
        this.userFeed = this.db.collection("userFeed");
        await this.userFeed.createIndex(
            { date: 1 },
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
        // TODO: use a set - gotta worry about JS equality BS though
        this.views = [];

        this.maxviews = Number(process.env.MaxViews) || 10000;
        this.viewresetrate =
            Number(process.env.ViewResetRate) || 1000 * 60 * 60;

        this.tagWeights = this.db.collection("tagWeights");
        this.performance_logging = this.db.collection("system.profile");

        // Setup minio

        this.minioClient = new Minio.Client({
            endPoint: process.env.MinioEndPoint,
            port: Number(process.env.MinioPort),
            useSSL: false,
            accessKey: process.env.MinioClientID,
            secretKey: process.env.MinioClientSecret,
            retryOptions: {
                maximumRetryCount: 0,
            },
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
            await this.generateBBAuthToken();
        }

        this.authentication = new Authentication(this);
    }
}

module.exports = DBController;
