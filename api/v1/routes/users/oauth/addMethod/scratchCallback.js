/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/addscratchlogin", async function (req, res) {
        const packet = req.query;

        const state = String(packet.state);
        const code = String(packet.code);

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const { valid, data } =
            await utils.UserManager.verifyOAuth2State(state);
        if (!valid) {
            utils.error(res, 400, "InvalidState");
            return;
        }

        const userid = data;

        const methods = await utils.UserManager.getOAuthMethods(userid);

        if (methods.includes("scratch")) {
            utils.error(res, 400, "Method already added");
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

        const user = await fetch(
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

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            console.error(`Error with oauth status: ${JSON.stringify(user)}`);
            utils.error(res, 500, "InternalError");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        await utils.UserManager.addOAuthMethod(
            username,
            "scratch",
            user.user.user_id,
        );

        const token = await utils.UserManager.newTokenGen(username);

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${utils.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
};
