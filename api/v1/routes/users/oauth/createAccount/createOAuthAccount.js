module.exports = (app, utils) => {
    app.get("/api/v1/users/createoauthaccount", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = packet.method;

        if (!method) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const oauth2Client = new OAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            "http://localhost:8080/api/v1/users/googlecallback/createaccount"
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
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=https://projects.penguinmod.com/api/v1/users/scratchoauthcreate&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State();
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GitHubOAuthClientID}&redirect_uri=https://projects.penguinmod.com/api/v1/users/githubcallback/createaccount&state=${state}&scope=read:user`);
            case "google":
                res.redirect(authorizeUrl);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}