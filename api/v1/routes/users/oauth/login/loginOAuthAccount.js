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
        switch (method) {
            case "scratch":
                let state = await utils.UserManager.generateOAuth2State();
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOAuthClientID}&redirect_uri=https://projects.penguinmod.com/api/v1/users/scratchoauthlogin&scopes=identify&state=${state}`);
                break;
            case "github":
                state = await utils.UserManager.generateOAuth2State();
                res.redirect(`https://github.com/login/oauth/authorize?client_id=${utils.env.GitHubOAuthClientID}&redirect_uri=https://projects.penguinmod.com/api/v1/users/githubcallback/login&state=${state}&scope=read:user`);
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}