module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/createaccount", async (req, res) => {
        const packet = req.query;

        const code = packet.code;
        const state = packet.state;

        if (!code || !state) {
            utils.error(res, 400, "Missing code or state");
            return;
        }

        if (!await utils.UserManager.verifyOAuth2State(state)) {
            utils.error(res, 400, "Invalid state");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${utils.env.ApiURL}/api/v1/users/googlecallback/createaccount`
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        }
        catch (e) {
            utils.error(res, 400, "Failed to get token");
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
        const user = await oauth2Client.request({url});
        
        const id = user.data.resourceName.split('/')[1];

        const nameGroup1 = [
            "Big",
            "Small",
            "Tall",
            "Short",
            "Long",
            "Soft",
            "Hard",
            "Swift",
            "Truthful",
            "Slippery",
        ]

        const nameGroup2 = [
            "Bed",
            "Parrot",
            "Penguin",
            "Falcon",
            "Pigeon",
            "Duck",
            "Goose",
            "Pheasant",
            "Owl",
            "Bear",
            "Horse"
        ]

        const name1 = nameGroup1[Math.floor(Math.random() * nameGroup1.length)];
        const name2 = nameGroup2[Math.floor(Math.random() * nameGroup2.length)];
        const randomNum = Math.floor(Math.random() * 1000);

        const username = `${name1}${name2}${randomNum}`;

        const userdata = await utils.UserManager.makeOAuth2Account("google", {id, username}, utils);

        const accountUsername = userdata.username;
        const token = userdata.token;

        await utils.UserManager.addIP(accountUsername, req.realIP);
        await utils.logs.sendCreationLog(accountUsername, userdata.id, "", "account");

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${accountUsername}`);
    });
}