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
    app.get("/api/v1/users/scratchoauthlogin", async function (req, res) {
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
            utils.error(res, 500, "InternalError");
            return;
        }

        const userid = await utils.UserManager.getUserIDByOAuthID(
            "scratch",
            user.user.user_id,
        );

        if (!userid) {
            // the method is not connected with an account
            utils.error(res, 400, "MethodNotConnected");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIPID(userid, req.realIP);

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${utils.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
};
