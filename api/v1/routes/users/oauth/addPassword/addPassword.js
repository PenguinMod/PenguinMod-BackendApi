module.exports = (app, utils) => {
    app.get("/api/v1/users/addpasswordtooauth", async function (req, res) {
        const packet = req.query;

        const method = packet.method;
        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!method || !username || !token) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (!methods) {
            
            utils.error(res, 400, "InvalidData");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${utils.env.ApiURL}/api/v1/users/googlecallback/addpassword`
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
                
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/scratchaddpassword&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State();
                
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GitHubOAuthClientID}&redirect_uri=${utils.env.ApiURL}/api/v1/users/githubcallback/addpassword&state=${state}&scope=read:user`);
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