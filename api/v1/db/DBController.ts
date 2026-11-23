import "dotenv/config";
import { MongoClient } from "mongodb";
import * as mongodb from "mongodb";
import Minio from "minio";
import { ulid } from "ulid";
import { createHash } from "node:crypto";
import { retryIfFailure } from "../../../utils/misc";

const using_backblaze = String(process.env.UseBackblaze) === "true";

interface BBUploadURL {
    url: string;
    token: string;
    expires: number;
    in_use: boolean;
    index: string;
}

interface BBListFileNames {
    files: {
        accountId: string;
        action: "start" | "upload" | "hide" | "folder";
        bucketId: string;
        contentLength: number;
        contentSha1: string;
        contentMd5: string;
        contentType: string;
        fileId: string;
        fileInfo: object;
        fileName: string;
        uploadTimestamp: number;
    }[];
    nextFileName: string;
}

export class DBController {
    client: MongoClient;
    db: mongodb.Db;
    users: mongodb.Collection;
    accountCustomization: mongodb.Collection;
    loggedIPs: mongodb.Collection;
    passwordResetStates: mongodb.Collection;
    sentEmails: mongodb.Collection;
    followers: mongodb.Collection;
    oauthIDs: mongodb.Collection;
    reports: mongodb.Collection;
    runtimeConfig: mongodb.Collection;
    projects: mongodb.Collection;
    projectStats: mongodb.Collection;
    messages: mongodb.Collection;
    oauthStates: mongodb.Collection;
    oneTimeTkCodes: mongodb.Collection;
    userFeed: mongodb.Collection;
    illegalList: mongodb.Collection;
    lastPolicyUpdates: mongodb.Collection;
    blocking: mongodb.Collection;
    tagWeights: mongodb.Collection;
    performance_logging: mongodb.Collection;

    minioClient: Minio.Client;

    bb_auth_token: string = "";
    need_new_bb_auth_token: number = 0;
    bb_api_url: string = "";
    bb_download_url: string = "";
    bb_upload_urls: Record<string, BBUploadURL> = {};

    constructor() {
        // TODO: add more indexes

        this.client = new MongoClient(
            process.env.MongoUri || "mongodb://localhost:27017",
        );

        this.db = this.client.db("pm_apidata");
        this.users = this.db.collection("users");

        this.accountCustomization = this.db.collection("accountCustomization");
        this.loggedIPs = this.db.collection("loggedIPs");

        this.passwordResetStates = this.db.collection("passwordResetStates");

        this.sentEmails = this.db.collection("sentEmails");

        this.followers = this.db.collection("followers");
        this.oauthIDs = this.db.collection("oauthIDs");
        this.reports = this.db.collection("reports");
        this.runtimeConfig = this.db.collection("runtimeConfig");

        this.projects = this.db.collection("projects");

        this.projectStats = this.db.collection("projectStats");

        this.messages = this.db.collection("messages");

        this.oauthStates = this.db.collection("oauthStates");

        this.oneTimeTkCodes = this.db.collection("ottCodes");

        this.userFeed = this.db.collection("userFeed");

        this.illegalList = this.db.collection("illegalList");
        this.lastPolicyUpdates = this.db.collection("lastPolicyUpdates");

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
            endPoint: String(process.env.MinioEndPoint),
            port: Number(process.env.MinioPort),
            useSSL: false,
            accessKey: process.env.MinioClientID,
            secretKey: process.env.MinioClientSecret,
            retryOptions: {
                maximumRetryCount: 0,
            },
        });
    }

    async init() {
        await this.client.connect();
        await this.users.createIndex({ username: 1 }, { unique: true });
        await this.users.createIndex({ id: 1 }, { unique: true });
        await this.users.createIndex({ token: 1 }, { unique: true });
        await this.loggedIPs.createIndex({ id: 1 });
        await this.loggedIPs.createIndex({ ip: 1 });
        await this.passwordResetStates.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
        await this.sentEmails.dropIndexes();
        await this.sentEmails.createIndex(
            { sentAt: 1 },
            { expireAfterSeconds: Number(process.env.LinkExpire) * 60 },
        );
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
        await this.projectStats.createIndex({ projectId: -1, type: -1 });
        await this.messages.createIndex({ receiver: -1, id: -1 });
        await this.messages.createIndex({ "message.previous": 1 });
        await this.oauthStates.createIndex(
            { createdAt: 1 },
            { expireAfterSeconds: 60 * 5 },
        ); // give 5 minutes
        await this.oneTimeTkCodes.createIndex(
            { expiresAt: 1 },
            { expireAfterSeconds: 0 },
        );
        await this.userFeed.createIndex(
            { date: 1 },
            { expireAfterSeconds: Number(process.env.FeedExpirationTime) },
        );

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

        // project bucket
        await this.makeBucket("projects");
        // project thumbnail bucket
        await this.makeBucket("project-thumbnails");
        // project asset bucket
        await this.makeBucket("project-assets");
        // pfp bucket
        await this.makeBucket("profile-pictures");

        if (using_backblaze) {
            await this.generateBBAuthToken();
        }
    }

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
            String(process.env.UseCustomBackblazeDownloadUrl) === "true"
                ? process.env.BackblazeDownloadUrl
                : sa.downloadUrl;

        this.bb_upload_urls = {};
        await this.generateBBUploadURL();
    }

    /**
     * Generates an upload url
     * @returns {Promise<object>}
     */
    async generateBBUploadURL() {
        const headers = new Headers();
        headers.set("Authorization", await this.getBBAuthToken());

        const hour = 1000 * 60 * 60;
        const day = hour * 24;
        const need_new = Date.now() + day - hour;

        try {
            const results = await fetch(
                `${this.bb_api_url}/b2api/v4/b2_get_upload_url?bucketId=${process.env.BackblazeBucketID}`,
                {
                    headers,
                },
            ).then((res) => res.json());

            const index = ulid();

            this.bb_upload_urls[index] = {
                url: results.uploadUrl,
                token: results.authorizationToken,
                expires: need_new,
                in_use: false,
                index,
            };

            return this.bb_upload_urls[index];
        } catch (e) {
            console.error(`failed to get BB upload url: ${e}`);
            return false;
        }
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
     * @returns {Promise<object|false>}
     */
    async getBBUploadUrl() {
        for (const key in this.bb_upload_urls) {
            const url_data = this.bb_upload_urls[key];
            if (Date.now() > url_data.expires) {
                this.removeBBUrl(url_data);
                continue;
            }

            if (!url_data.in_use) {
                // i dont trust JS object shenanigans... its probably a reference,
                // but better safe than sorry
                this.bb_upload_urls[key].in_use = true;
                return url_data;
            }
        }

        const data = await this.generateBBUploadURL();

        if (!data) {
            return false;
        }

        this.bb_upload_urls[data.index].in_use = true;
        return data;
    }

    async doneWithBBUpload(url_data: BBUploadURL) {
        this.bb_upload_urls[url_data.index].in_use = false;
    }

    async removeBBUrl(url_data: BBUploadURL) {
        delete this.bb_upload_urls[url_data.index];
    }

    async listDataWithPrefixBackblaze(
        prefix: string,
        n: number = 1000,
    ): Promise<BBListFileNames> {
        // n is default 1k because max per class c is 1k, so we don't wanna go above that.
        // if we do, it charges us for 2 instead of 1.
        // we shouldn't have that many assets anyways.

        const headers = new Headers();
        headers.set("Authorization", await this.getBBAuthToken());

        const bucketID = process.env.BackblazeBucketID;

        const results = [];
        let startFileName = "";

        while (n !== 0) {
            const num = n > 10000 ? 10000 : n;

            let url =
                this.bb_api_url +
                `/b2api/v4/b2_list_file_names?bucketId=${bucketID}&maxFileCount=${num}&prefix=${encodeURIComponent(prefix)}`;

            if (startFileName) {
                url += `&startFileName=${encodeURIComponent(startFileName)}`;
            }

            const res = (await retryIfFailure(
                () =>
                    fetch(url, {
                        headers,
                    }).then((res) => res.json()),
                3,
                300,
            )) as BBListFileNames;

            results.push(...res.files);

            n -= num;

            startFileName = res.nextFileName;
        }

        return {
            files: results,
            nextFileName: startFileName,
        };
    }

    async listNamesWithPrefixBackblaze(
        prefix: string,
        n: number = 1000,
    ): Promise<string[]> {
        return (await this.listDataWithPrefixBackblaze(prefix, n)).files.map(
            (file) => file.fileName,
        );
    }

    async saveToBackblaze(name: string, file: Buffer): Promise<boolean> {
        const upload = async (): Promise<boolean> => {
            const url_data = await this.getBBUploadUrl();

            if (!url_data) {
                throw new Error("can't find bb upload url");
            }

            const upload_url = url_data.url;
            const auth_token = url_data.token;

            const headers = new Headers();
            headers.set("Authorization", auth_token);
            headers.set("X-Bz-File-Name", encodeURIComponent(name));
            headers.set("Content-Type", "b2/x-auto");
            headers.set("Content-Length", String(file.length));

            const hash = createHash("sha1");
            hash.update(file);
            headers.set("X-Bz-Content-Sha1", hash.digest("hex"));

            try {
                const result = await fetch(upload_url, {
                    method: "POST",
                    headers,
                    body: new Uint8Array(file),
                });

                if (!result.ok) {
                    this.removeBBUrl(url_data);
                    throw new Error("Backblaze upload failed");
                }

                this.doneWithBBUpload(url_data);
                return true;
            } catch (e) {
                this.removeBBUrl(url_data);
                throw e;
            }
        };

        try {
            return await retryIfFailure(upload, 2, 200, (e) =>
                console.warn(`Backblaze upload failed, retrying: ${e}`),
            );
        } catch (e) {
            // TODO: log to webhook and ping either Ian or devs
            console.error("Backblaze IS NOT SAVING!!!!!", e);
            return false;
        }
    }

    /**
     * Download a file from the backblaze asset storage
     * @param {string} name The name of the requested file
     * @returns {Promise<Buffer>}
     */
    async downloadFromBackblaze(name: string): Promise<Buffer> {
        const url = `${this.bb_download_url}/file/${process.env.BackblazeBucketName}/${name}`;

        const response = await fetch(url);
        const arrayBuffer = await response.arrayBuffer();

        const buffer = Buffer.from(new Uint8Array(arrayBuffer));

        return buffer;
    }

    async renameObjectBackblaze(
        old_name: string,
        new_name: string,
    ): Promise<undefined> {
        const id = await this.getBBFileID(old_name);

        await this.copyObjectBackblazeID(id, new_name);
        await this.deleteFileBackblazeID(old_name, id);
    }

    async copyObjectBackblazeID(
        file_id: string,
        new_name: string,
    ): Promise<undefined> {
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
        });

        if (!result.ok) {
            console.error(
                `FAILED TO COPY!!!! VERY BAD!!! ${JSON.stringify(await result.json())}`,
            );
        }
    }

    async deleteFileBackblazeID(
        fileName: string,
        fileId: string,
    ): Promise<undefined> {
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
        });

        if (!result.ok) {
            console.error(
                `FAILED TO DELETE FILE!!!! BIG BAD!!!! ${JSON.stringify(await result.json())}`,
            );
        }
    }

    /**
     * Get the ID of a file from Backblaze
     * @param {string} name The name of the file
     * @returns {Promise<string>}
     */
    async getBBFileID(name: string): Promise<string> {
        // boy do i hate backblaze
        return (await this.listNamesWithPrefixBackblaze(name, 1))[0];
    }

    /**
     * Delete multiple objects from Backblaze given a prefix
     * @param {string} prefix The prefix to search for
     * @param {number} n The number of objects to search for. Cannot exceed 10000.
     */
    async deleteMultipleObjectsBackblaze(
        prefix: string,
        n = 1000,
    ): Promise<undefined> {
        const objects = await this.listDataWithPrefixBackblaze(prefix, n);

        for (const obj of objects.files) {
            await this.deleteFileBackblazeID(obj.fileName, obj.fileId);
        }
    }

    async makeBucket(bucketName: string): Promise<undefined> {
        if (!(await this.minioClient.bucketExists(bucketName))) {
            await this.minioClient.makeBucket(bucketName);
        }
    }
}
