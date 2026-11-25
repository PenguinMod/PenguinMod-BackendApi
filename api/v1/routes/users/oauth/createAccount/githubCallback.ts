/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
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

            const { valid } = await utils.UserManager.verifyOAuth2State(state);
            if (!valid) {
                res.status(400).json({ error: "Invalid state" });
                return;
            }

            const response = await utils.UserManager.makeOAuth2Request(
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
                    return false;
                });

            if (!username) {
                return;
            }

            if (username.status !== 200) {
                res.status(500).json({ error: "InternalError" });
                return;
            }

            const existing_userid = await utils.UserManager.getUserIDByOAuthID(
                "github",
                username.user.id,
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

            const userdata = await utils.UserManager.makeOAuth2Account(
                "github",
                username.user,
                utils,
                res,
            );

            if (!userdata) {
                res.status(400).json({ error: "UnknownError" });
                return;
            }

            const profilePicture = await fetch(
                `https://github.com/${username.user.login.toLowerCase()}.png`,
            )
                .then((res) => res.arrayBuffer())
                .catch((e) => {
                    res.status(500).json({ error: "InternalError" });
                    return new Promise((resolve, reject) => resolve());
                });

            if (!profilePicture) {
                return;
            }

            const pfp_buffer = Buffer.from(profilePicture);

            await utils.UserManager.setProfilePicture(userdata.id, pfp_buffer);

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
};
