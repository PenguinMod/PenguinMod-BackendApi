import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { OAuth2Client } from "google-auth-library";
import { userId } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/googlecallback/addmethod",
        async function (req, res) {
            const packet = req.query;

            const code = String(packet.code);
            const state = String(packet.state);

            if (!state || !code) {
                res.status(400).json({ error: "Missing state or code" });
                return;
            }

            const { valid, data } =
                await utils.manager.auth.verifyOAuth2State(state);
            if (!valid) {
                res.status(400).json({ error: "InvalidState" });
                return;
            }

            const userid = userId(String(data));

            const methods = await utils.manager.auth.getOAuthMethods(userid);

            if (methods.includes("google")) {
                res.status(400).json({ error: "Method already added" });
                return;
            }

            const oauth2Client = new OAuth2Client(
                process.env.GoogleOAuthClientID,
                process.env.GoogleOAuthClientSecret,
                `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`,
            );

            let r;
            try {
                r = await oauth2Client.getToken(code);
            } catch (e) {
                res.status(400).json({ error: "Invalid code" });
                return;
            }
            const tokens = r.tokens;

            oauth2Client.setCredentials(tokens);

            const url =
                "https://people.googleapis.com/v1/people/me?personFields=names";
            const user = await oauth2Client.request({ url });

            if (
                typeof user.data !== "object" ||
                !user.data ||
                !("resourceName" in user.data) ||
                typeof user.data.resourceName !== "string"
            ) {
                throw new Error(
                    `Invalid response from google oauth client: ${user}`,
                );
            }

            const id = user.data?.resourceName.split("/")[1];

            await utils.manager.auth.addOAuthMethod(userid, "google", id);

            const token = await utils.manager.auth.newTokenGen(userid);

            const ottCode = await utils.manager.auth.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
        },
    );
}
