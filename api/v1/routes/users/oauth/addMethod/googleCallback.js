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

        const code = packet.code;
        const state = packet.state;

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        if (!await utils.UserManager.verifyOAuth2State(state)) {
            utils.error(res, 400, "InvalidState");
            return;
        }

        const userid = state.split("_")[1]; // get the userid from the state (a little hacky)

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        }
        catch (e) {
            utils.error(res, 400, "Invalid code");
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
        const user = await oauth2Client.request({url});
        
        const id = user.data.resourceName.split('/')[1];

        const username = await utils.UserManager.getUsernameByID(userid);

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes("google")) {
            utils.error(res, 400, "Method already added");
            return;
        }

        await utils.UserManager.addOAuthMethod(username, "google", id);

        const token = await utils.UserManager.newTokenGen(username);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}