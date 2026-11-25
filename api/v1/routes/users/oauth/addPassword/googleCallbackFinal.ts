import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/googlecallback/addpasswordfinal",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const tokens = String(packet.at);
            const password = String(packet.password);

            if (!tokens || !password) {
                res.status(400).json({
                    error: "Missing access token or password",
                });
                return;
            }

            const passwordDoesNotMeetLength =
                password.length < 8 || password.length > 50;
            const passwordMeetsTextInclude =
                password.match(/[a-z]/) && password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                password.match(/[0-9]/) && password.match(/[^a-z0-9]/i);
            if (passwordDoesNotMeetLength) {
                res.status(400).json({ error: "InvalidLengthPassword" });
                return;
            }
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                res.status(400).json({ error: "MissingRequirementsPassword" });
                return;
            }

            const oauth2Client = new OAuth2Client(
                process.env.GoogleOAuthClientID,
                process.env.GoogleOAuthClientSecret,
                `${process.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
            );

            try {
                oauth2Client.setCredentials(JSON.parse(tokens));
            } catch (e) {
                res.status(400).json({ error: "Failed to set credentials" });
                return;
            }

            const url =
                "https://people.googleapis.com/v1/people/me?personFields=names";
            let user;
            try {
                user = await oauth2Client.request({ url });
            } catch (e) {
                res.status(400).json({ error: "Failed to request user data" });
                return;
            }

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

            const id = user.data.resourceName.split("/")[1];

            const userid = await utils.manager.auth.getUserIDByOAuthID(
                "google",
                id,
            );

            if (!userid) {
                return res.status(400).json({ error: "UserNotFound" });
            }

            const [token] = await Promise.all([
                utils.manager.auth.changePassword(userid, password),
                utils.manager.users.addIPID(userid, req.realIP),
            ]);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ token });
        },
    );
}
