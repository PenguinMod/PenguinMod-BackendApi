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
        "/api/v1/users/addoauthmethod",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            // get the method
            const packet = req.query;

            const method = String(packet.method);

            const username = req.login.username;

            // TODO: some of our DB queries are making extra requests (i.e. getting the users ID)

            const methods = await utils.UserManager.getOAuthMethods(username);

            if (methods.includes(method)) {
                utils.error(res, 400, "Method already added");
                return;
            }

            const userid = req.login.id;

            // using switch case cuz erm i like it
            // TODO: we should not store the user id in the state. it exposes the user id to the methods.
            // which isnt *terrible* but still. Instead, we should store the user id with the state in the DB.
            const state = await utils.UserManager.generateOAuth2State(
                `_${userid}`,
            );
            switch (method) {
                case "scratch":
                    res.redirect(
                        `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/addscratchlogin&scopes=identify&state=${state}`,
                    );
                    break;
                case "github":
                    res.redirect(
                        `https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/addmethod&state=${state}&scope=read:user`,
                    );
                    break;
                case "google": {
                    const oauth2Client = new utils.googleOAuth2Client(
                        utils.env.GoogleOAuthClientID,
                        utils.env.GoogleOAuthClientSecret,
                        `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`,
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
