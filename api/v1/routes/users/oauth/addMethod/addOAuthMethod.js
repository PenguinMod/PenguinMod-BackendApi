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
    app.get("/api/v1/users/addoauthmethod", utils.cors(), async function (req, res) {
        // get the method
        const packet = req.query;

        const method = packet.method;
        const token = packet.token;

        if (!method || !username || !token) {
            utils.error(res, 400, "Missing method, username, or token");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes(method)) {
            utils.error(res, 400, "Method already added");
            return;
        }

        const userid = await utils.UserManager.getIDByUsername(username);
        
        // using switch case cuz erm i like it
        let state = await utils.UserManager.generateOAuth2State(`_${userid}`);
        switch (method) {
            case "scratch":
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/addscratchlogin&scopes=identify&state=${state}`);
                break;
            case "github":
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/addmethod&state=${state}&scope=read:user`);
                break;
            case "google":
                /*
                // __DISABLE
                utils.error(res, 400, "Google OAuth Disabled");
                return;
                */

                const oauth2Client = new utils.googleOAuth2Client(
                    utils.env.GoogleOAuthClientID,
                    utils.env.GoogleOAuthClientSecret,
                    `${process.env.ApiURL}/api/v1/users/googlecallback/addmethod`
                );
            
                const authorizeUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/userinfo.profile',
                    state: state
                });
                res.redirect(authorizeUrl);
                break;
            default:
                utils.error(res, 400, "Invalid method");
                return;
        }
    });
}