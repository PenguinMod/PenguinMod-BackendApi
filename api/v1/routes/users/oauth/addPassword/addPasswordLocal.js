module.exports = (app, utils) => {
    app.get("/api/v1/users/addpasswordtooauthlocal", async function (req, res) {
        const packet = req.query;

        const method = packet.method;
        const username = packet.username;
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

        if (!methods.includes(method)) {
            utils.error(res, 400, "InvalidData");
            return;
        }
        
        // using switch case cuz erm i like it
        let state;
        switch (method) {
            case "scratch":
                state = await utils.UserManager.generateOAuth2State();
                
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=http://localhost:${utils.PORT}/api/v1/users/scratchaddpassword&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State();
                
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GitHubOAuthClientID}&redirect_uri=http://localhost:8080/api/v1/users/githubcallback/addpassword&state=${state}&scope=read:user`);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}