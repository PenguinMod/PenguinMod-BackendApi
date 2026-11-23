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
    app.get("/api/v1/users/addoauthmethod", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = String(packet.method);
        const code = String(packet.code);

        const token = await utils.UserManager.exchangeCodeForToken(code);

        if (!token) {
            return res.status(401).json({ error: "InvalidCode" });
        }

        const login = await utils.UserManager.loginWithToken(token);

        if (!login.success) {
            return res.status(401).json({ error: "InvalidToken" });
        }

        const methods = await utils.UserManager.getOAuthMethods(login.id);

        if (methods.includes(method)) {
            res.status(400).json({ error: "Method already added" });
            return;
        }

        const state = await utils.UserManager.generateOAuth2State(login.id);
        switch (method) {
            case "scratch":
                res.redirect(
                    `https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${process.env.ScratchOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/addscratchlogin&scopes=identify&state=${state}`,
                );
                break;
            case "github":
                res.redirect(
                    `https://github.com/login/oauth/authorize?client_id=${process.env.GithubOAuthClientID}&redirect_uri=${process.env.ApiURL}/api/v1/users/githubcallback/addmethod&state=${state}&scope=read:user`,
                );
                break;
            case "google": {
                const oauth2Client = new utils.googleOAuth2Client(
                    process.env.GoogleOAuthClientID,
                    process.env.GoogleOAuthClientSecret,
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
                res.status(400).json({ error: "Invalid method" });
                return;
        }
    });
};
