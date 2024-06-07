export default (app, utils) => {
    app.get("/api/v1/users/createoauthaccountlocal", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = packet.method;

        if (!method) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${utils.env.ApiURL}/api/v1/users/googlecallback/createaccount`
        );
    
        const authorizeUrl = oauth2Client.generateAuthUrl({
            access_type: 'offline',
            scope: 'https://www.googleapis.com/auth/userinfo.profile',
            state: await utils.UserManager.generateOAuth2State()
        });
        
        // using switch case cuz erm i like it
        let state;
        switch (method) {
            case "scratch":
                state = await utils.UserManager.generateOAuth2State();
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/scratchoauthcreate&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State("_createAccount");
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GithubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/createaccount&state=${state}&scope=read:user`);
                break;
            case "google":
                res.redirect(authorizeUrl);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}