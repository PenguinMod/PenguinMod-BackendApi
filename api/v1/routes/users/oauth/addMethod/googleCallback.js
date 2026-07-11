const UserManager = require("../../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/addmethod", async (req, res) => {
        const packet = req.query;

        const code = String(packet.code);
        const state = String(packet.state);

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        const userid = await utils.UserManager.verifyOAuth2State(state);
        if (!userid) {
            utils.error(res, 400, "InvalidState");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`,
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        } catch (e) {
            utils.error(res, 400, "Invalid code");
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url =
            "https://people.googleapis.com/v1/people/me?personFields=names";
        const user = await oauth2Client.request({ url });

        const google_id = user.data.resourceName.split("/")[1];

        if (await utils.UserManager.OAuthMethodInUse(google_id, "google")) {
            utils.error(res, 400, "AccountAlreadyInUse");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes("google")) {
            utils.error(res, 400, "Method already added");
            return;
        }

        await utils.UserManager.addOAuthMethod(username, "google", google_id);

        const token = await utils.UserManager.newTokenGen(username);

        res.status(200);
        res.redirect(
            `/api/v1/users/sendloginsuccess?token=${token}&username=${username}`,
        );
    });
};
