const UserManager = require("../../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

// TODO: this should be a post

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/createoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        if (!(await utils.UserManager.canCreateAccount())) {
            return utils.error(res, 403, "Account creation is not enabled");
        }

        const method = String(packet.method);

        if (!method) {
            utils.error(res, 400, "Missing method");
            return;
        }

        switch (method) {
            case "scratch": {
                const state =
                    await utils.UserManager.generateScratchCode();
                res.redirect(
                    `${utils.env.HomeURL}/scratchaccount?method=create&code=${encodeURIComponent(state)}`,
                );
                break;
            }
            case "github": {
                const state = await utils.UserManager.generateOAuth2State();
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/createaccount&state=${state}&scope=read:user`,
                );
                break;
            }
            case "google": {
                const state = await utils.UserManager.generateOAuth2State();
                const oauth2Client = new utils.googleOAuth2Client(
                    utils.env.GoogleOAuthClientID,
                    utils.env.GoogleOAuthClientSecret,
                    `${utils.env.ApiURL}/api/v1/users/googlecallback/createaccount`,
                );

                const authorizeUrl = oauth2Client.generateAuthUrl({
                    access_type: "offline",
                    scope: "https://www.googleapis.com/auth/userinfo.profile",
                    state: state,
                });
                res.redirect(authorizeUrl);
                break;
            }
            default:
                utils.error(res, 400, "Invalid method");
                return;
        }
    });
};
