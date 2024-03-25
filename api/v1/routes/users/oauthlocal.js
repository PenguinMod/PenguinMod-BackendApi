module.exports = (app, utils) => {
    app.get("/api/v1/users/oauthlocal", async function (req, res) {
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
                res.redirect(`https://oauth2.scratch-wiki.info/wiki/Special:ScratchOAuth2/authorize?client_id=${utils.env.ScratchOauth2ClientID}&redirect_uri=http://localhost:8080/api/v1/users/oauthlogin&scopes=identify&state=${state}`);
                break;
            default:
                utils.error(res, 400, "InvalidData");
                return;
        }
    });
}