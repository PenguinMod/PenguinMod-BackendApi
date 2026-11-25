import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { sendCreationLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/githubcallback/createaccount",
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

            const response = await utils.manager.auth.makeOAuth2Request(
                code,
                "github",
            );

            if (!response) {
                res.status(500).json({ error: "OAuthServerDidNotRespond" });
                return;
            }

            const username = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${response.access_token}`,
                },
            })
                .then(async (res) => {
                    return { user: await res.json(), status: res.status };
                })
                .catch((e) => {
                    res.status(500).json({ error: "OAuthServerDidNotRespond" });
                    console.error("OAuth server didn't respond:", e);
                });

            if (!username) {
                return;
            }

            if (username.status !== 200) {
                res.status(500).json({ error: "InternalError" });
                return;
            }

            const existing_userid = await utils.manager.auth.getUserIDByOAuthID(
                "github",
                username.user.id,
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

            const userdata = await utils.manager.auth.makeOAuth2Account(
                "github",
                {
                    oauth_username: username.user.login,
                    oauth_id: username.user.id,
                },
            );

            if (!userdata.ok) {
                res.status(400).json({ error: userdata.error });
                return;
            }

            const profilePicture = await fetch(
                `https://github.com/${username.user.login.toLowerCase()}.png`,
            )
                .then((res) => res.arrayBuffer())
                .catch((e) => {
                    res.status(500).json({ error: "InternalError" });
                    console.error("OAuth server didn't respond:", e);
                });

            if (!profilePicture) {
                return;
            }

            const pfp_buffer = Buffer.from(profilePicture);

            await utils.manager.users.setProfilePicture(
                userdata.value.id,
                pfp_buffer,
            );

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
