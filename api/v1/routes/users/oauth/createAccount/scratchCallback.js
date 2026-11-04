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
    app.get("/api/v1/users/scratchoauthcreate", async function (req, res) {
        const packet = req.query;

        const state = String(packet.state);
        const code = String(packet.code);

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const { valid } = await utils.UserManager.verifyOAuth2State(state);
        if (!valid) {
            utils.error(res, 400, "Invalid state");
            return;
        }

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(
            code,
            "scratch",
        );

        if (!response) {
            utils.error(res, 500, "OAuthServerDidNotRespond");
            return;
        }

        const username = await fetch(
            "https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/user",
            {
                headers: {
                    Authorization: `Bearer ${btoa(response.access_token)}`,
                },
            },
        )
            .then(async (res) => {
                return { user: await res.json(), status: res.status };
            })
            .catch((e) => {
                utils.error(res, 500, "OAuthServerDidNotRespond");
                return new Promise((resolve, reject) => resolve());
            });

        if (!username) {
            return;
        }

        if (username.status !== 200) {
            utils.error(res, 500, "InternalError");
            return;
        }

        if (
            await utils.UserManager.getUserIDByOAuthID(
                "scratch",
                username.user.user_id,
            )
        ) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        // create the user
        const userdata = await utils.UserManager.makeOAuth2Account(
            "scratch",
            username.user,
            utils,
            res,
        );

        if (!userdata) {
            utils.error(res, 400, "UnknownError");
            return;
        }

        const profilePicture = await fetch(
            `https://trampoline.turbowarp.org/avatars/by-username/${username.user.user_name.toLowerCase()}`,
        )
            .then((res) => res.arrayBuffer())
            .catch((e) => {
                utils.error(res, 500, "InternalError");
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
        res.redirect(`${utils.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
};
