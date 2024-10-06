module.exports = (app, utils) => {
    app.get("/api/v1/users/loginoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = packet.method;

        if (!method) {
            utils.error(res, 400, "InvalidData");
            return;
        }
        
        // using switch case cuz erm i like it
        const state = await utils.UserManager.generateOAuth2State();
        switch (method) {
            case "scratch":
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/scratchoauthlogin&scopes=identify&state=${state}`);
                break;
            case "github":
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/login&state=${state}&scope=read:user`);
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
                    `${utils.env.ApiURL}/api/v1/users/googlecallback/login`
                );
            
                const authorizeUrl = oauth2Client.generateAuthUrl({
                    access_type: 'offline',
                    scope: 'https://www.googleapis.com/auth/userinfo.profile',
                    state: state
                });

                res.redirect(authorizeUrl);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}