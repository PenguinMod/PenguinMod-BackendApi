import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { sendCreationLog } from "../../../../../../utils/logs";
import { OAuth2Client } from "google-auth-library";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/googlecallback/createaccount",
        async function (req, res) {
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
                `${process.env.ApiURL}/api/v1/users/googlecallback/createaccount`,
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
                "https://people.googleapis.com/v1/people/me?personFields=names,emailAddresses";
            const user = await oauth2Client.request({ url });

            if (
                typeof user.data !== "object" ||
                !user.data ||
                !("resourceName" in user.data) ||
                typeof user.data.resourceName !== "string" ||
                !("emailAddresses" in user.data) ||
                !Array.isArray(user.data.emailAddresses)
            ) {
                throw new Error(
                    `Invalid response from google oauth client: ${user}`,
                );
            }

            const id = user.data.resourceName.split("/")[1];
            const email = user.data.emailAddresses[0].value;

            const existing_userid = await utils.manager.auth.getUserIDByOAuthID(
                "google",
                id,
            );
            if (existing_userid) {
                // they are stupid. their account already exists. we'll let them be stupid
                const token =
                    await utils.manager.auth.newTokenGen(existing_userid);

                await utils.manager.users.addIPID(existing_userid, req.realIP);

                const ottCode =
                    await utils.manager.auth.genOneTimeTokenCode(token);

                res.status(200);
                res.redirect(
                    `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
                );
                return;
            }

            const nameGroup1 = [
                "Big",
                "Small",
                "Tall",
                "Short",
                "Long",
                "Swift",
                "Truthful",
                "Slippery",
                "Sharp",
                "Tricky",
                "Red",
                "Orange",
                "Yellow",
                "Green",
                "Blue",
                "Purple",
                "Violet",
                "Toon",
                "Soft",
                "Smart",
                "Round",
            ];

            const nameGroup2 = [
                "Bed",
                "Parrot",
                "Penguin",
                "Falcon",
                "Pigeon",
                "Duck",
                "Goose",
                "Pheasant",
                "Owl",
                "Bear",
                "Horse",
                "Pig",
                "Eagle",
                "Cat",
                "Mouse",
            ];

            const name1 =
                nameGroup1[Math.floor(Math.random() * nameGroup1.length)];
            const name2 =
                nameGroup2[Math.floor(Math.random() * nameGroup2.length)];
            const randomNum = Math.floor(Math.random() * 1000);

            const username = `${name1}${name2}${randomNum}`;

            const userdata = await utils.manager.auth.makeOAuth2Account(
                "google",
                { oauth_id: id, oauth_username: username, email },
            );

            if (!userdata.ok) {
                res.status(400).json({ error: userdata.error });
                return;
            }

            const accountUsername = userdata.value.username;
            const token = userdata.value.token;

            await utils.manager.users.addIPID(userdata.value.id, req.realIP);
            sendCreationLog(accountUsername, userdata.value.id, "", "account");

            const ottCode = await utils.manager.auth.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
        },
    );
}
