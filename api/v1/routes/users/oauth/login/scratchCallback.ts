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
    app.get("/api/v1/users/scratchoauthlogin", async function (req, res) {
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

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(
            code,
            "scratch",
        );

        if (!response) {
            res.status(500).json({ error: "OAuthServerDidNotRespond" });
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
                res.status(500).json({ error: "OAuthServerDidNotRespond" });
                return new Promise((resolve, reject) => resolve());
            });

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            res.status(500).json({ error: "InternalError" });
            return;
        }

        const userid = await utils.UserManager.getUserIDByOAuthID(
            "scratch",
            user.user.user_id,
        );

        if (!userid) {
            // the method is not connected with an account
            res.status(400).json({ error: "MethodNotConnected" });
            return;
        }

        const token = await utils.UserManager.newTokenGen(userid);

        await utils.UserManager.addIPID(userid, req.realIP);

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
};
