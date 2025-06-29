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
    app.get("/api/v1/users/githubcallback/addmethod", async function (req, res) {
        const packet = req.query;

        const state = packet.state;
        const code = packet.code;

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        if (!await utils.UserManager.verifyOAuth2State(state)) {
            utils.error(res, 400, "InvalidState");
            return;
        }

        const userid = state.split("_")[1]; // get the userid from the state (a little hacky)

        const response = await utils.UserManager.makeOAuth2Request(code, "github");

        if (!response) {
            utils.error(res, 500, "OAuthServerDidNotRespond")
            return;
        }

        const user = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${response.access_token}`
            }
        })
        .then(async res => {
            return {"user": await res.json(), "status": res.status};
        })
        .catch(e => {
            utils.error(res, 500, "OAuthServerDidNotRespond");
            return new Promise((resolve, reject) => resolve());
        })

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            utils.error(res, 500, "InternalError");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes("github")) {
            utils.error(res, 400, "Method already added");
            return;
        }

        await utils.UserManager.addOAuthMethod(username, "github", user.user.id);

        const token = await utils.UserManager.newTokenGen(username);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}