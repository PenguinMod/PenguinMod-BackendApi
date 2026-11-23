import * as bcrypt from "bcrypt";
import { ulid } from "ulid";
import { randomBytes } from "crypto";
import * as logs from "../../../utils/logs";
import { readFileSync } from "fs";
import path from "path";
import { DBController } from "./DBController";
import Manager from "./Manager";
const basePFP = readFileSync(
    path.join(__dirname, "../../../static/penguin.png"),
);

const REMOVE_SYMBOLS_REGEX = /[\s._*!-+/]+/g;

export interface Login {
    success: boolean;
    username: string;
    token: string;
    id: string;
    isDonator: boolean;
    isMod: boolean;
    isAdmin: boolean;
    email: string;
    emailVerified: boolean;
    badges: string[];
    rank: number;
    fullMeta: object;
}

export class Authentication {
    db: DBController;
    manager: Manager;

    constructor(db_controller: DBController, manager: Manager) {
        this.db = db_controller;
        this.manager = manager;
    }

    async loginWithToken(
        token: string,
        allowBanned: boolean,
        get_full_meta: boolean = false,
    ): Promise<Login> {
        const data: Login = {
            success: false,
            username: "",
            token,
            id: "",
            rank: 0,
            isDonator: false,
            isMod: false,
            isAdmin: false,
            emailVerified: false,
            email: "",
            badges: [],
            fullMeta: {},
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

    async loginWithPassword(
        username: string,
        password: string,
        allowBanned: boolean,
    ): Promise<string | false> {
        const result = await this.db.users.findOne({ username: username });

        if (!result) {
            return false;
        }

        if (
            (result.permBanned || result.unbanTime > Date.now()) &&
            !allowBanned
        ) {
            return false;
        }

        if (await bcrypt.compare(password, result.password)) {
            return await this.newTokenGen(result.id);
        } else {
            return false;
        }
    }

    async createAccount(
        username: string,
        real_username: string,
        password: string | undefined,
        email_data: { email: string; verified: boolean } | undefined,
        birthday: string | undefined,
        country: string | undefined,
        is_studio: boolean,
        check_username: boolean = false,
    ): Promise<{ token: string; id: string } | false> {
        const result = await this.db.users.findOne({ username: username });
        if (result) {
            throw new Error("AccountExists");
        }

        const illegalWordingError = async (text, type) => {
            const trigger = await this.checkForUnsafeUsername(text);
            if (trigger) {
                const illegalWordIndex =
                    await this.getIndexOfUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                logs.sendHeatLog(
                    before + "\x1b[31;1m" + illegalWord + "\x1b[0m" + after,
                    trigger,
                    type,
                    username,
                );

                throw new Error("IllegalWordsUsed");
            }
        };

        const potentiallyIllegalWordingError = async (text, type) => {
            const trigger = await this.checkForPotentiallyUnsafeUsername(text);
            if (trigger) {
                const illegalWordIndex =
                    await this.getIndexOfPotentiallyUnsafeUsername(text);

                const before = text.substring(0, illegalWordIndex[0]);
                const after = text.substring(illegalWordIndex[1]);
                const illegalWord = text.substring(
                    illegalWordIndex[0],
                    illegalWordIndex[1],
                );

                logs.sendHeatLog(
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

        if (
            check_username &&
            (await illegalWordingError(username, "username"))
        ) {
            return false;
        }

        await potentiallyIllegalWordingError(username, "username");

        let email = email_data;
        let emailVerified = false;
        if (email_data && typeof email_data === "object") {
            email = email_data.email;
            emailVerified = email_data.verify;
        }

        const hash = password ? await bcrypt.hash(password, 10) : "";
        const id = ulid();
        const token = randomBytes(32).toString("hex");
        const current_time = Date.now();
        await this.db.users.insertOne({
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
            emailVerified,
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

        await this.db.minioClient.putObject("profile-pictures", id, basePFP);

        return { token, id };
    }

    /**
     * @returns {Promise<boolean>}
     */
    async canCreateAccount(): Promise<boolean> {
        return (
            await this.db.runtimeConfig.findOne({
                id: "accountCreationEnabled",
            })
        )?.value;
    }

    /**
     * Create an account with some data from an OAuth method
     * @param {"google"|"github"|"scratch"} method The method used
     * @param {object} data The data given by the method
     * @param {*} utils
     * @param {*} res
     * @returns
     */
    async makeOAuth2Account(
        method: "google" | "github" | "scratch",
        data: { oauth_username: string; oauth_id: string; email?: string },
    ) {
        let username = data.oauth_username.toLowerCase();
        let real_username = data.oauth_username;
        const id = data.oauth_id;

        const email = data.email
            ? { email: data.email, verified: true }
            : undefined;
        const check_username = method !== "google";

        let n = 0;
        const orig_username = username;
        while (await this.manager.users.existsByUsername(username)) {
            username = `${orig_username}${n}`;
            real_username = `${real_username}${n}`;
            n++;
        }

        const info = await this.createAccount(
            username,
            real_username,
            undefined,
            email,
            undefined,
            undefined,
            false,
            check_username,
        );

        if (!info) {
            console.error(`failed to create oauth account: ${username}`);
            return false;
        }

        await this.addOAuthMethod(info.id, method, id);
        return { token: info.token, username, id: info.id };
    }

    async checkForUnsafeUsername(username: string): Promise<string> {
        const basicTrigger = await this.checkForIllegalWording(username);
        if (basicTrigger) {
            return basicTrigger;
        }

        let unsafeUsernames = (
            await this.db.illegalList.findOne({ id: "unsafeUsernames" })
        )?.items;

        unsafeUsernames = unsafeUsernames || [];

        const no_spaces = username.replace(REMOVE_SYMBOLS_REGEX, "");

        for (const item of unsafeUsernames) {
            if (no_spaces.includes(item)) {
                return item;
            }
        }

        return "";
    }

    async newTokenGen(id: string): Promise<string> {
        const token = randomBytes(32).toString("hex");

        await this.db.users.updateOne(
            { id },
            { $set: { token: token, lastLogin: Date.now() } },
        );

        return token;
    }

    async getOAuthMethods(id: string): Promise<string[]> {
        const result = (await this.db.oauthIDs.find({ id }).toArray()).map(
            (x: any) => x.method,
        );

        return result;
    }

    async addOAuthMethod(
        id: string,
        method: string,
        code: string,
    ): Promise<undefined> {
        await this.db.oauthIDs.insertOne({
            id: id,
            method: method,
            code: code,
        });
    }

    async removeOAuthMethod(id: string, method: string): Promise<undefined> {
        await this.db.oauthIDs.deleteOne({ id, method });
    }

    async getUserIDByOAuthID(
        method: string,
        id: string,
    ): Promise<string | false> {
        const result = await this.db.oauthIDs.findOne({
            method: method,
            code: id,
        });

        if (!result) {
            return false;
        }

        return result.id;
    }
}
