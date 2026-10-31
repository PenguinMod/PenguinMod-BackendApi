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
    app.get(
        "/api/v1/users/addpasswordtooauth",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.query;

            const method = String(packet.method);

            const username = req.login.username;

            // TODO: this method immediately gets the ID. just pass the ID.
            const methods = await utils.UserManager.getOAuthMethods(username);

            if (!methods) {
                utils.error(
                    res,
                    400,
                    "No login methods (PLEASE REPORT THIS VIA OUR SUPPORT PAGE)",
                );
                return;
            }

            // using switch case cuz erm i like it
            const state = await utils.UserManager.generateOAuth2State();
            switch (method) {
                case "scratch":
                    res.redirect(
                        `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/scratchaddpassword&scopes=identify&state=${state}`,
                    );
                    break;
                case "github":
                    res.redirect(
                        `https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/addpassword&state=${state}&scope=read:user`,
                    );
                    break;
                case "google": {
                    const oauth2Client = new utils.googleOAuth2Client(
                        utils.env.GoogleOAuthClientID,
                        utils.env.GoogleOAuthClientSecret,
                        `${utils.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
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
        },
    );
};
