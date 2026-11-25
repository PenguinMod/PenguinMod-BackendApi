import type { Application } from "express";
import type { Utils } from "../../../../../../index";

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

            const { valid } = await utils.UserManager.verifyOAuth2State(state);
            if (!valid) {
                res.status(400).json({ error: "Invalid state" });
                return;
            }

            const oauth2Client = new utils.googleOAuth2Client(
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

            const id = user.data.resourceName.split("/")[1];
            const email = user.data.emailAddresses[0].value;

            const existing_userid = await utils.UserManager.getUserIDByOAuthID(
                "google",
                id,
            );
            if (existing_userid) {
                // they are stupid. their account already exists. we'll let them be stupid
                const token =
                    await utils.UserManager.newTokenGen(existing_userid);

                await utils.UserManager.addIPID(existing_userid, req.realIP);

                const ottCode =
                    await utils.UserManager.genOneTimeTokenCode(token);

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

            const userdata = await utils.UserManager.makeOAuth2Account(
                "google",
                { id, username, email },
                utils,
                res,
            );

            if (!userdata) {
                res.status(400).json({ error: "UnknownError" });
                return;
            }

            const accountUsername = userdata.username;
            const token = userdata.token;

            await utils.UserManager.addIPID(userdata.id, req.realIP);
            await utils.logs.sendCreationLog(
                accountUsername,
                userdata.id,
                "",
                "account",
            );

            const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
        },
    );
}
