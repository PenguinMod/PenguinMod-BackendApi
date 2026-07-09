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
    app.get("/api/v1/users/loginoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = String(packet.method);

        if (!method) {
            utils.error(res, 400, "Missing method");
            return;
        }

        // TODO: perhaps we should give scratchaccount a code now, instead of getting it actively on the page
        // after entering username
        switch (method) {
            case "scratch":
                res.redirect(
                    `${utils.env.HomeURL}/scratchaccount?method=login`,
                );
                break;
            case "github": {
                const state = await utils.UserManager.generateOAuth2State();
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/login&state=${state}&scope=read:user`,
                );
                break;
            }
            case "google": {
                /*
                // __DISABLE
                utils.error(res, 400, "Google OAuth Disabled");
                return;
                */

                const state = await utils.UserManager.generateOAuth2State();
                const oauth2Client = new utils.googleOAuth2Client(
                    utils.env.GoogleOAuthClientID,
                    utils.env.GoogleOAuthClientSecret,
                    `${utils.env.ApiURL}/api/v1/users/googlecallback/login`,
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
