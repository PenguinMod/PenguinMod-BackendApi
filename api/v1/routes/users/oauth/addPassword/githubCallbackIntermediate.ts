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
        "/api/v1/users/githubcallback/addpassword",
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

            // now make the request
            const response = await utils.UserManager.makeOAuth2Request(
                code,
                "github",
            );

            if (!response) {
                res.status(500).json({ error: "OAuthServerDidNotRespond" });
                return;
            }

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/oauthchangepasswordintermediate?method=github&at=${response.access_token}`,
            );
        },
    );
};
