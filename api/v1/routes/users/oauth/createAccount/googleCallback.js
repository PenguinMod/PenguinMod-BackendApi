module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/createaccount", async (req, res) => {
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
            "http://localhost:8080/api/v1/users/googlecallback/createaccount"
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
        const displayName = user.data.names[0].displayName;

        const regex = /^((?<irlName>.*?)\s+\((?<onlineName>.+?)\)|(?<fallbackName>.*))$/i 

        const { groups } = regex.exec(displayName)
        const usedFallback = !!groups.fallbackName
        const username = groups.onlineName ?? groups.fallbackName

        const userdata = await utils.UserManager.makeOAuth2Account("google", {id, username});

        const accountUsername = userdata.username;
        const token = userdata.token;

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${accountUsername}`);
    });
}