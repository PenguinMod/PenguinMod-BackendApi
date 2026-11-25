import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/googlecallback/addpassword",
        async function (req, res) {
            const packet = req.query;

            const state = String(packet.state);
            const code = String(packet.code);

            if (!state || !code) {
                res.status(400).json({ error: "Missing state or code" });
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
                `${process.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
            );

            let r;
            try {
                r = await oauth2Client.getToken(code);
            } catch (e) {
                res.status(400).json({ error: "Failed to get token" });
                return;
            }
            const tokens = r.tokens;

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/oauthchangepasswordintermediate?method=google&at=${JSON.stringify(tokens)}`,
            );
        },
    );
}
