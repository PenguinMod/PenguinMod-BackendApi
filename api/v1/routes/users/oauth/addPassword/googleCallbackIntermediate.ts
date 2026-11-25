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
        "/api/v1/users/googlecallback/addpassword",
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

            const oauth2Client = new utils.googleOAuth2Client(
                process.env.GoogleOAuthClientID,
                process.env.GoogleOAuthClientSecret,
                `${process.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
            );

            let r;
            try {
                r = await oauth2Client.getToken(code);
            } catch (e) {
                res.status(400).json({ error: "Failed to get token" });
                return;
            }
            const tokens = r.tokens;

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/oauthchangepasswordintermediate?method=google&at=${JSON.stringify(tokens)}`,
            );
        },
    );
};
