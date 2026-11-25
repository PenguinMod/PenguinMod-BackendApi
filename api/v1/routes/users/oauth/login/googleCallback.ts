import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/googlecallback/login", async function (req, res) {
        const packet = req.query;

        const code = String(packet.code);
        const state = String(packet.state);

        if (!code || !state) {
            res.status(400).json({ error: "Missing code or state" });
            return;
        }

        const { valid } = await utils.manager.auth.verifyOAuth2State(state);
        if (!valid) {
            res.status(400).json({ error: "Invalid state" });
            return;
        }

        const oauth2Client = new OAuth2Client(
            process.env.GoogleOAuthClientID,
            process.env.GoogleOAuthClientSecret,
            `${process.env.ApiURL}/api/v1/users/googlecallback/login`,
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        } catch (e) {
            res.status(400).json({ error: "Failed to get token" });
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url =
            "https://people.googleapis.com/v1/people/me?personFields=names";
        let user: unknown;
        const try_user = async (tries: number): Promise<boolean> => {
            if (tries > 3) {
                res.status(500).json({
                    error: "Google api failed to respond",
                });
                return false;
            }

            try {
                user = await oauth2Client.request({ url });
            } catch (e) {
                console.warn("Google api failed to respond: " + e);
                return await new Promise((resolve) =>
                    setTimeout(
                        () => try_user(tries + 1).then(resolve),
                        200 * (1 + Math.random()),
                    ),
                );
            }

            return true;
        };
        if (!(await try_user(0))) {
            return;
        }

        if (
            !user ||
            typeof user !== "object" ||
            !("data" in user) ||
            typeof user.data !== "object" ||
            !user.data ||
            !("resourceName" in user.data) ||
            typeof user.data.resourceName !== "string"
        ) {
            throw new Error(
                `Invalid response from google oauth client: ${user}`,
            );
        }

        const id = user.data.resourceName.split("/")[1];

        const userid = await utils.manager.auth.getUserIDByOAuthID(
            "google",
            id,
        );

        if (!userid) {
            res.status(400).json({ error: "UserID not found" });
            return;
        }

        const token = await utils.manager.auth.newTokenGen(userid);

        await utils.manager.users.addIPID(userid, req.realIP);

        const ottCode = await utils.manager.auth.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
}
