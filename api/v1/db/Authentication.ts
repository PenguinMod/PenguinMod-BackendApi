import * as bcrypt from "bcrypt";
import { ulid } from "ulid";
import { randomBytes } from "crypto";
import { readFileSync } from "fs";
import path from "path";
import { DBController } from "./DBController";
import Manager from "./Manager";
import { OAuthMethod, UserData } from "./types";
import { makeUsername, projectId, UserId, userId, Username } from "./new-types";
import { err, ok, Result } from "../../../utils/Result";
const basePFP = readFileSync(
    path.join(__dirname, "../../../static/penguin.png"),
);

type AccountCreationError = "AccountExists" | "IllegalWordingError";

export interface Login {
    username: Username;
    token: string;
    id: UserId;
    isDonator: boolean;
    isMod: boolean;
    isAdmin: boolean;
    email: string;
    emailVerified: boolean;
    badges: string[];
    rank: number;
    fullMeta: UserData;
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
    ): Promise<Login | null> {
        if (token === "undefined") {
            return null;
        }

        const result = await this.db.users.findOne({ token });

        if (!result) {
            return null;
        }

        const data: Login = {
            username: result.username,
            token,
            id: result.id,
            rank: result.rank,
            isDonator: result.badges.includes("donator"),
            isMod: result.moderator || result.admin,
            isAdmin: result.admin,
            emailVerified: result.emailVerified,
            email: result.email || "",
            badges: result.badges,
            fullMeta: result,
        };

        if (
            ((result.permBanned || result.unbanTime > Date.now()) &&
                !allowBanned) ||
            result.lastLogin +
                (Number(process.env.LoginInvalidationTime) || 259200000) <
                Date.now()
        ) {
            return null;
        }

        await this.db.users.updateOne(
            { token },
            { $set: { lastLogin: Date.now() } },
        );
        return data;
    }

    async loginWithPassword(
        username: Username,
        password: string,
        allowBanned: boolean,
    ): Promise<Result<Login, "UserNotFound" | "Banned" | "PasswordIncorrect">> {
        const result = await this.db.users.findOne({ username: username });

        if (!result) {
            return err("UserNotFound");
        }

        if (
            (result.permBanned || result.unbanTime > Date.now()) &&
            !allowBanned
        ) {
            return err("Banned");
        }

        if (await bcrypt.compare(password, result.password)) {
            const token = await this.newTokenGen(result.id);

            return ok({
                username: result.username,
                token,
                id: result.id,
                isDonator: result.badges.includes("donator"),
                isMod: result.moderator || result.admin,
                isAdmin: result.admin,
                email: result.email || "",
                emailVerified: result.emailVerified,
                badges: result.badges,
                rank: result.rank,
                fullMeta: result,
            });
        } else {
            return err("PasswordIncorrect");
        }
    }

    async createAccount(
        username: string,
        password: string | undefined,
        email_data: { email: string; verified: boolean } | undefined,
        birthday: string | undefined,
        country: string | undefined,
        is_studio: boolean,
        check_username: boolean,
    ): Promise<Result<{ token: string; id: UserId }, AccountCreationError>> {
        const result = await this.db.users.findOne({
            username: makeUsername(username),
        });
        if (result) {
            return err("AccountExists");
        }

        if (check_username) {
            if (
                await this.manager.misc.illegalWordingError(
                    username,
                    "username",
                    (
                        await this.db.illegalList.findOne({
                            id: "unsafeUsernames",
                        })
                    )?.items,
                )
            ) {
                return err("IllegalWordingError");
            }
            await this.manager.misc.maybeIllegalWordingError(
                username,
                "username",
                (
                    await this.db.illegalList.findOne({
                        id: "potentiallyUnsafeUsernames",
                    })
                )?.items,
            );
        }

        const email = email_data ? email_data.email : null;
        const emailVerified = email_data ? email_data.verified : false;

        const hash = password ? await bcrypt.hash(password, 10) : "";
        const id = userId(ulid());
        const token = randomBytes(32).toString("hex");
        const current_time = Date.now();
        await this.db.users.insertOne({
            id,
            username: makeUsername(username),
            real_username: username,
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
            featuredProject: projectId(""),
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

        return ok({ token, id });
    }

    async canCreateAccount(): Promise<boolean> {
        return (
            await this.db.runtimeConfig.findOne({
                id: "accountCreationEnabled",
            })
        )?.value as boolean;
    }

    async makeOAuth2Account(
        method: OAuthMethod,
        data: { oauth_username: string; oauth_id: string; email?: string },
    ): Promise<
        Result<
            { token: string; username: Username; id: UserId },
            AccountCreationError
        >
    > {
        let username = makeUsername(data.oauth_username);
        let real_username = data.oauth_username;
        const id = data.oauth_id;

        const email = data.email
            ? { email: data.email, verified: true }
            : undefined;
        const check_username = method !== "google";

        let n = 0;
        const orig_username = username;
        while (await this.manager.users.existsByUsername(username)) {
            username = `${orig_username}${n}` as Username;
            real_username = `${real_username}${n}`;
            n++;
        }

        const info = await this.createAccount(
            username,
            undefined,
            email,
            undefined,
            undefined,
            false,
            check_username,
        );

        if (!info.ok) {
            return err(info.error);
        }

        await this.addOAuthMethod(info.value.id, method, id);
        return ok({ token: info.value.token, username, id: info.value.id });
    }

    async newTokenGen(id: UserId): Promise<string> {
        const token = randomBytes(32).toString("hex");

        await this.db.users.updateOne(
            { id },
            { $set: { token: token, lastLogin: Date.now() } },
        );

        return token;
    }

    async getOAuthMethods(id: UserId): Promise<OAuthMethod[]> {
        const result = (await this.db.oauthIDs.find({ id }).toArray()).map(
            (x) => x.method,
        );

        return result;
    }

    async addOAuthMethod(
        id: UserId,
        method: OAuthMethod,
        code: string,
    ): Promise<void> {
        await this.db.oauthIDs.insertOne({
            id: id,
            method: method,
            code: code,
        });
    }

    async removeOAuthMethod(id: UserId, method: OAuthMethod): Promise<void> {
        await this.db.oauthIDs.deleteOne({ id, method });
    }

    async getUserIDByOAuthID(
        method: OAuthMethod,
        id: string,
    ): Promise<UserId | null> {
        const result = await this.db.oauthIDs.findOne({
            method,
            code: id,
        });

        if (!result) {
            return null;
        }

        return result.id;
    }

    async verifyOAuth2State(
        state: string,
    ): Promise<{ valid: boolean; data: unknown }> {
        const result = await this.db.oauthStates.findOneAndDelete({
            state: state,
            createdAt: { $lt: new Date(Date.now() + 1000 * 60 * 5) },
        });

        return { valid: !!result, data: result ? result.data : undefined };
    }

    async generateOAuth2State(data?: string): Promise<string> {
        const state = randomBytes(32).toString("base64").replaceAll("+", "-");

        await this.db.oauthStates.insertOne({
            state: state,
            data,
            createdAt: new Date(),
        });

        return state;
    }

    async makeOAuth2Request(
        code: string,
        method: OAuthMethod,
    ): Promise<{ access_token: string } | null> {
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
            console.error("OAuth2 request failed:", e);
        }

        return null;
    }

    async changePassword(id: UserId, newPassword: string): Promise<string> {
        const password = await bcrypt.hash(newPassword, 10);
        const token = randomBytes(32).toString("hex");
        await this.db.users.updateOne({ id }, { $set: { password, token } });

        return token;
    }

    async genOneTimeTokenCode(token: string): Promise<string> {
        const code = randomBytes(32).toString("hex");

        await this.db.oneTimeTkCodes.insertOne({
            _id: code,
            token,
            expiresAt: new Date(Date.now() + 60_000),
        });

        return code;
    }

    async exchangeCodeForToken(code: string): Promise<string | null> {
        const result = await this.db.oneTimeTkCodes.findOneAndDelete({
            _id: code,
            expiresAt: { $gt: new Date() },
        });

        if (!result) {
            return null;
        }

        return result.token;
    }

    async generatePasswordResetState(
        email: string,
        userid: UserId,
        is_verify_email: boolean = false,
    ): Promise<string> {
        const state =
            randomBytes(32).toString("hex") + (is_verify_email ? "_VE" : "");

        await this.db.passwordResetStates.insertOne({
            state: state,
            email: email,
            id: userid,
            createdAt: new Date(),
        });

        return state;
    }

    async verifyPasswordResetState(
        state: string,
        email: string,
        is_verify_email: boolean = false,
    ): Promise<boolean> {
        if (!state || !email) {
            return false;
        }

        if (!state || state.endsWith("_VE") !== is_verify_email) {
            console.warn(
                (state.endsWith("_VE")
                    ? "says ve but not ve"
                    : "ve but says not ve") +
                    ` - ${state.slice(-4)} (${email})`,
            );
            return false;
        }

        const result = await this.db.passwordResetStates.findOneAndDelete({
            state: state,
            email: email,
            createdAt: {
                $lt: new Date(
                    Date.now() + Number(process.env.LinkExpire) * 60 * 1000,
                ),
            },
        });

        return !!result;
    }

    async logout(id: UserId): Promise<void> {
        await this.newTokenGen(id);
    }
}
