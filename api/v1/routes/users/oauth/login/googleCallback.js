module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/login", async (req, res) => {
        const packet = req.query;

        const code = packet.code;
        const state = packet.state;

        if (!code || !state) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.verifyOAuth2State(state)) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${utils.env.ApiUrl}/api/v1/users/googlecallback/login`
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        }
        catch (e) {
            utils.error(res, 400, "InvalidData");
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
        const user = await oauth2Client.request({url});
        
        const id = user.data.resourceName.split('/')[1];
        
        const userid = await utils.UserManager.getUserIDByOAuthID("google", id);

        if (!userid) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}