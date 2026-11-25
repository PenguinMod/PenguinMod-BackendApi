import type { Application } from "express";
import type { Utils } from "../../../../../../index";

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
                await utils.UserManager.verifyOAuth2State(state);
            if (!valid) {
                res.status(400).json({ error: "InvalidState" });
                return;
            }

            const userid = data;

            const methods = await utils.UserManager.getOAuthMethods(userid);

            if (methods.includes("google")) {
                res.status(400).json({ error: "Method already added" });
                return;
            }

            const oauth2Client = new utils.googleOAuth2Client(
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

            const id = user.data.resourceName.split("/")[1];

            const username = await utils.UserManager.getUsernameByID(userid);

            await utils.UserManager.addOAuthMethod(userid, "google", id);

            const token = await utils.UserManager.newTokenGen(userid);

            const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
        },
    );
}
