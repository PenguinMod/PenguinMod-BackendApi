import { escapeRegex } from "../../../utils/misc";
import { err, ok, Result } from "../../../utils/Result";
import { DBController } from "./DBController";
import Manager from "./Manager";
import { UserId } from "./new-types";
import { EmailType, ExtFeedItem, FeedType, UserData } from "./types";
import Mailjet from "node-mailjet";

export class Users {
    db: DBController;
    manager: Manager;

    constructor(db_controller: DBController, manager: Manager) {
        this.db = db_controller;
        this.manager = manager;
    }

    async existsByUsername(
        username: string,
        showBanned: boolean = false,
    ): Promise<boolean> {
        let query: object = { username: username };
        if (!showBanned) {
            query = {
                $and: [
                    query,
                    { permBanned: false, unbanTime: { $lt: Date.now() } },
                ],
            };
        }
        const result = await this.db.users.findOne(query);

        return !!result;
    }

    async getUserData(username: string): Promise<UserData | null> {
        return await this.db.users.findOne({ username });
    }

    async getUserDataByID(id: UserId): Promise<UserData | null> {
        return await this.db.users.findOne({ id });
    }

    async addToFeed(
        userID: UserId,
        type: FeedType,
        data: string,
    ): Promise<void> {
        await this.db.userFeed.insertOne({
            userID: userID,
            type: type,
            data: data,
            date: new Date(),
        });
    }

    async changeUsername(
        username: string,
        newUsername: string,
        real_username: string,
    ): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { username: newUsername, real_username } },
        );
    }

    async setBio(username: string, newBio: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { bio: newBio } },
        );
    }

    async setFavoriteProject(
        username: string,
        type: number,
        id: string,
    ): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { favoriteProjectType: type, favoriteProjectID: id } },
        );
    }

    async setRank(id: UserId, rank: number): Promise<void> {
        await this.db.users.updateOne({ id }, { $set: { rank } });
        await this.db.projects.updateMany(
            { author: id },
            { $set: { authorRank: rank } },
        );
    }

    async setLastUpload(username: string, lastUpload: number): Promise<void> {
        await this.db.users.updateOne({ username }, { $set: { lastUpload } });
    }

    async addBadge(username: string, badge: string): Promise<void> {
        await this.db.users.updateOne(
            { username },
            { $push: { badges: badge } },
        );
    }

    async setBadges(username: string, badges: string[]): Promise<void> {
        await this.db.users.updateOne({ username }, { $set: { badges } });
    }

    async removeBadge(username: string, badge: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $pull: { badges: badge } },
        );
    }

    async setFeaturedProject(username: string, id: string): Promise<void> {
        await this.db.users.updateOne(
            {
                username: username,
            },
            {
                $set: { featuredProject: id },
            },
        );
    }

    async setFeaturedProjectTitle(
        username: string,
        title: number,
    ): Promise<void> {
        await this.db.users.updateOne(
            {
                username: username,
            },
            {
                $set: { featuredProjectTitle: title },
            },
        );
    }

    async setAdmin(username: string, admin: boolean): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { admin: admin } },
        );
    }

    async setModerator(username: string, moderator: boolean): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { moderator } },
        );
    }

    async getAllAdmins(): Promise<{ id: string; username: string }[]> {
        const result = (
            await this.db.users.find({ admin: true }).toArray()
        ).map((admin) => {
            return { id: admin.id, username: admin.username };
        });

        return result;
    }

    async getAllModerators(): Promise<{ id: string; username: string }[]> {
        const result = (
            await this.db.users.find({ moderator: true }).toArray()
        ).map((admin) => {
            return { id: admin.id, username: admin.username };
        });

        return result;
    }

    async setPermBanned(
        id: UserId,
        banned: boolean,
        reason: string,
        remove_follows: boolean = true,
    ): Promise<void> {
        await this.db.users.updateOne(
            { id },
            { $set: { permBanned: banned, banReason: reason } },
        );

        await this.manager.projects.privateAllProjects(id, banned);

        await this.db.reports.updateMany(
            { reporter: id },
            { $set: { resolved: true } },
        );

        await this.db.reports.updateMany(
            { reportee: id },
            { $set: { resolved: true } },
        );

        if (remove_follows) {
            const following = this.db.followers.find({
                follower: id,
            });

            for await (const follow of following) {
                await this.db.followers.deleteOne({ _id: follow._id });
                await this.db.users.updateOne(
                    { id: follow.target },
                    { $inc: { followers: -1 } },
                );
            }

            await this.db.followers.deleteMany({ target: id });
        }
    }

    async setEmail(
        username: string,
        email: string,
        verify: boolean = false,
    ): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { email: email, emailVerified: verify } },
        );
    }

    async getUserByEmail(email: string): Promise<UserData | null> {
        return await this.db.users.findOne({ email });
    }

    async logout(username: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { lastLogin: 0 } },
        );
    }

    async followUser(
        follower: UserId,
        followee: UserId,
        follow: boolean,
    ): Promise<void> {
        const existing = await this.db.followers.findOne({
            follower,
            target: followee,
        });

        if (existing) {
            if (existing.active === follow) {
                return;
            }

            await this.db.followers.updateOne(
                { follower, target: followee },
                { $set: { active: follow } },
            );
        } else {
            await this.db.followers.insertOne({
                follower,
                target: followee,
                active: follow,
            });
        }

        await this.db.users.updateOne(
            { id: follower },
            { $inc: { following: follow ? 1 : -1 } },
        );
        await this.db.users.updateOne(
            { id: followee },
            { $inc: { followers: follow ? 1 : -1 } },
        );
    }

    async isFollowing(follower: UserId, followee: UserId): Promise<boolean> {
        const result = await this.db.followers.findOne({
            follower,
            target: followee,
            active: true,
        });

        return !!result;
    }

    async getFollowers(
        id: UserId,
        page: number,
        pageSize: number,
    ): Promise<UserId[]> {
        const result = await this.db.followers
            .aggregate<UserId>([
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
                    $replaceRoot: { newRoot: "$follower" },
                },
            ])
            .toArray();

        return result;
    }

    async getFollowing(
        id: UserId,
        page: number,
        pageSize: number,
    ): Promise<UserId[]> {
        const result = await this.db.followers
            .aggregate<UserId>([
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
                    $replaceRoot: { newRoot: "$target" },
                },
                {
                    $unset: "banned",
                },
            ])
            .toArray();

        return result;
    }

    async hasFollowed(follower: UserId, followee: UserId): Promise<boolean> {
        const result = await this.db.followers.findOne({
            follower,
            target: followee,
            active: true,
        });

        return !!result;
    }

    async getFollowerCount(username: string): Promise<number | null> {
        const result = await this.db.users.findOne({ username: username });

        return result ? result.followers : null;
    }

    async toggleWatchlist(username: string, enabled: boolean): Promise<void> {
        await this.db.users.updateOne(
            { username },
            { $set: { onWatchlist: enabled } },
        );
    }

    async isOnWatchlist(username: string): Promise<boolean | null> {
        return (
            !!(await this.db.users.findOne({ username }))?.onWatchlist || null
        );
    }

    async getAlts(user_id: UserId): Promise<UserId[]> {
        const current_ids = new Set<UserId>();
        await this._getAltsRec(user_id, current_ids);
        return [...current_ids];
    }

    async idListToUsernames(ids: UserId[]): Promise<string[]> {
        const usernames = (
            await this.db.users
                .find({
                    id: { $in: ids },
                })
                .toArray()
        ).map((x) => x.username);
        return usernames;
    }

    async _getAltsRec(
        user_id: UserId,
        current_ids: Set<UserId>,
    ): Promise<void> {
        if (current_ids.has(user_id)) {
            return;
        }
        current_ids.add(user_id);
        const current_data = await this.getIpsByID(user_id);
        for (const item of current_data) {
            const to_recurse = await this.getAllAccountsWithIP(item.ip);
            for (const user of to_recurse) {
                await this._getAltsRec(user.id, current_ids);
            }
        }
    }

    async verifyFollowers(id: UserId): Promise<void> {
        const followers = await this.db.followers
            .find({ target: id, active: true })
            .toArray();

        for (const follower of followers) {
            const user = await this.db.users.findOne({ id: follower.follower });

            if (user?.permBanned) {
                await this.db.followers.updateOne(
                    { follower: follower.follower, target: id },
                    { $set: { active: false } },
                );
            }
        }

        // count the amount of followers
        const count = await this.db.followers.countDocuments({
            target: id,
            active: true,
        });

        await this.db.users.updateOne(
            { id: id },
            { $set: { followers: count } },
        );
    }

    async getAllBlocked(user_id: UserId): Promise<UserId[]> {
        return (
            await this.db.blocking.find({ blocker: user_id }).toArray()
        ).map((t) => t.target);
    }

    async blockUser(
        user_id: UserId,
        target_id: UserId,
        active: boolean,
    ): Promise<void> {
        if (
            await this.db.blocking.findOne({
                blocker: user_id,
                target: target_id,
            })
        ) {
            await this.db.blocking.updateOne(
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

        await this.db.blocking.insertOne({
            blocker: user_id,
            target: target_id,
            active,
            time: Date.now(),
        });
    }

    async hasBlocked(user_id: UserId, target_id: UserId): Promise<boolean> {
        return !!(await this.db.blocking.findOne({
            blocker: user_id,
            target: target_id,
            active: true,
        }));
    }

    async addIP(id: UserId, ip: string): Promise<void> {
        await this.db.loggedIPs.updateOne(
            { id: id, ip: ip },
            {
                $set: { lastLogin: Date.now() },
                $setOnInsert: {
                    banned: false,
                },
            },
            { upsert: true },
        );
    }

    async addIPID(id: UserId, ip: string): Promise<void> {
        await this.db.loggedIPs.updateOne(
            { id: id, ip: ip },
            {
                $set: { lastLogin: Date.now() },
                $setOnInsert: {
                    banned: false,
                },
            },
            { upsert: true },
        );
    }

    async getIpsByID(
        id: UserId,
    ): Promise<{ ip: string; banned: boolean; lastLogin: number }[]> {
        const ips = (await this.db.loggedIPs.find({ id: id }).toArray()).map(
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

    async isIPBanned(ip: string): Promise<boolean> {
        const result = await this.db.loggedIPs.findOne({
            ip: ip,
            banned: true,
        });

        return !!result;
    }

    async isUserIPBanned(id: UserId): Promise<boolean> {
        const result = await this.db.loggedIPs.findOne({ id, banned: true });

        return !!result;
    }

    async banIP(ip: string, toggle: boolean): Promise<void> {
        await this.db.loggedIPs.updateMany(
            { ip: ip },
            { $set: { banned: toggle } },
        );

        if (toggle) {
            const accounts = await this.db.loggedIPs.find({ ip: ip }).toArray();
            for (const account of accounts) {
                await this.setPermBanned(account.id, true, "IP banned", true);
            }
        }
    }

    async banUserIP(id: UserId, toggle: boolean): Promise<void> {
        await this.db.loggedIPs.updateMany(
            { id: id },
            { $set: { banned: toggle } },
        );

        if (toggle) {
            const ips = await this.getIpsByID(id);

            for (const ip of ips) {
                const accounts = await this.db.loggedIPs
                    .find({ ip: ip.ip })
                    .toArray();

                for (const account of accounts) {
                    await this.setPermBanned(
                        account.id,
                        true,
                        "IP banned",
                        true,
                    );
                }
            }
        }
    }

    async getAllAccountsWithIP(
        ip: string,
    ): Promise<{ id: UserId; username: string }[]> {
        return await this.db.loggedIPs
            .aggregate<{ id: UserId; username: string }>([
                { $match: { ip: ip } },
                {
                    $lookup: {
                        from: "users",
                        localField: "id",
                        foreignField: "id",
                        as: "userInfo",
                    },
                },
                {
                    $addFields: {
                        username: { $arrayElemAt: ["$userInfo.username", 0] },
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
    }

    async setEmailVerified(username: string, toggle: boolean): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { emailVerified: toggle } },
        );
    }

    async getUserDataByEmail(email: string): Promise<UserData | null> {
        return await this.db.users.findOne({ email: email });
    }

    async getEmailCount(): Promise<number> {
        return await this.db.sentEmails.countDocuments({
            sentAt: {
                $lt: new Date(
                    Date.now() + Number(process.env.LinkExpire) * 60 * 1000,
                ),
            },
        });
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
        userid: UserId,
        userip: string,
        type: EmailType,
        email: string,
        name: string,
        subject: string,
        message: string,
        messageHtml: string,
    ): Promise<null | "OverEmailLimit" | "MailjetError"> {
        if ((await this.getEmailCount()) > Number(process.env.EmailLimit)) {
            return "OverEmailLimit";
        }

        await this.db.sentEmails.insertOne({
            userid,
            userip,
            sentAt: new Date(),
            type,
        });

        const mailjet = new Mailjet({
            apiKey: process.env.MJApiKeyPublic,
            apiSecret: process.env.MJApiKeyPrivate,
        });

        try {
            await mailjet.post("send", { version: "v3.1" }).request({
                Messages: [
                    {
                        // TODO: don't hardcode email addr, move to env
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
            console.error(`mail error: ${e}`);
            return "MailjetError";
        }

        return null;
    }

    async lastEmailSentByID(userid: UserId): Promise<Date | null> {
        const result = await this.db.sentEmails.findOne(
            { userid },
            {
                sort: { sentAt: -1 },
            },
        );

        return result?.sentAt || null;
    }

    async lastEmailSentByIP(userip: string): Promise<Date | null> {
        const result = await this.db.sentEmails.findOne(
            { userip },
            {
                sort: { sentAt: -1 },
            },
        );

        return result?.sentAt || null;
    }

    async setPrivateProfile(username: string, toggle: boolean): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { privateProfile: toggle } },
        );
    }

    async setFollowingSeeProfile(
        username: string,
        toggle: boolean,
    ): Promise<void> {
        await this.db.users.updateOne(
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
    async tempBanUser(
        username: string,
        reason: string,
        length: number,
    ): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { banReason: reason, unbanTime: Date.now() + length } },
        );
    }

    async unTempBan(username: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { unbanTime: 0 } },
        );
    }

    async markPrivacyPolicyAsRead(username: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { lastPrivacyPolicyRead: Date.now() } },
        );
    }

    async markTOSAsRead(username: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { lastTOSRead: Date.now() } },
        );
    }

    async markGuidelinesAsRead(username: string): Promise<void> {
        await this.db.users.updateOne(
            { username: username },
            { $set: { lastGuidelinesRead: Date.now() } },
        );
    }

    async getAllFollowing(
        id: UserId,
        page: number,
        pageSize: number,
    ): Promise<{ username: string; id: string }[]> {
        const result = await this.db.followers
            .aggregate<{ username: string; id: string }>([
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

    async getUserFeed(id: UserId, size: number): Promise<ExtFeedItem[]> {
        const feed = await this.db.followers
            .aggregate<ExtFeedItem>([
                { $match: { follower: id, active: true } },

                {
                    $lookup: {
                        from: "userFeed",
                        localField: "target",
                        foreignField: "userID",
                        pipeline: [
                            // { $match: { expireAt: { $gt: Date.now() } } },
                            { $sort: { date: -1 } },
                            { $limit: size },
                        ],
                        as: "items",
                    },
                },

                { $unwind: "$items" },
                { $replaceRoot: { newRoot: "$items" } },

                { $sort: { date: -1 } },
                { $limit: size },

                {
                    $lookup: {
                        from: "users",
                        localField: "userID",
                        foreignField: "id",
                        pipeline: [{ $project: { _id: 0, username: 1 } }],
                        as: "userInfo",
                    },
                },
                {
                    $addFields: {
                        username: { $arrayElemAt: ["$userInfo.username", 0] },
                        id: "$userID",
                    },
                },
                { $unset: ["userInfo"] },
            ])
            .toArray();

        return feed;
    }

    async setProfilePicture(id: UserId, buffer: Buffer): Promise<void> {
        await this.db.minioClient.putObject("profile-pictures", id, buffer);
    }

    async getProfilePicture(
        username: string,
    ): Promise<Result<Buffer, "UserNotFound" | "ImageNotFound">> {
        const id = (await this.getUserData(username))?.id;

        if (!id) {
            return err("UserNotFound");
        }

        const buffer = await this.db.readObjectFromBucket(
            "profile-pictures",
            id,
        );

        if (!buffer) {
            return err("ImageNotFound");
        }

        return ok(buffer);
    }

    async setUserBirthdayAndOrCountry(
        username: string,
        birthday: string | undefined,
        country: string | undefined,
    ): Promise<void> {
        if (!birthday && !country) {
            console.warn("neither birthday nor country entered");
            return;
        }
        const updateObj: {
            birthday?: string;
            birthdayEntered?: true;
            country?: string;
            countryEntered?: true;
        } = {};
        if (birthday) {
            updateObj.birthday = birthday;
            updateObj.birthdayEntered = true;
        }
        if (country) {
            updateObj.country = country;
            updateObj.countryEntered = true;
        }
        await this.db.users.updateOne(
            { username: username },
            { $set: updateObj },
        );
    }

    async searchUsers(
        query: string,
        page: number,
        pageSize: number,
    ): Promise<{ username: string; real_username: string; id: UserId }[]> {
        const result = await this.db.users
            .aggregate<{ username: string; real_username: string; id: UserId }>(
                [
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
                    {
                        $project: {
                            username: true,
                            real_username: true,
                            id: true,
                            _id: false,
                        },
                    },
                ],
            )
            .toArray();

        return result;
    }

    async getLastPolicyRead(username: string): Promise<{
        privacyPolicy: number;
        TOS: number;
        guidelines: number;
    } | null> {
        const result = await this.db.users.findOne({ username: username });
        if (!result) {
            return null;
        }

        return {
            privacyPolicy: result.lastPrivacyPolicyRead,
            TOS: result.lastTOSRead,
            guidelines: result.lastGuidelinesRead,
        };
    }
}
