module.exports = (app, utils) => {
    app.get("/api/v1/users/addoauthmethodlocal", async function (req, res) {
        // get the method
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

        if (methods.includes(method)) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const userid = await utils.UserManager.getIDByUsername(username);
        
        // using switch case cuz erm i like it
        let state;
        switch (method) {
            case "scratch":
                state = await utils.UserManager.generateOAuth2State(`_${userid}`);

                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=http://localhost:${utils.PORT}/api/v1/users/addscratchlogin&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State(`_${userid}`);

                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GitHubOAuthClientID}&redirect_uri=https://projects.penguinmod.com/api/v1/users/githubcallback/addmethod&state=${state}&scope=read:user`);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}