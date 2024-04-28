module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback", async (req, res) => {
        const packet = req.query;

        const code = packet.code;

        if (!code) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const r = await utils.googleOAuth2Client.getToken(code);
        const tokens = r.tokens;

        utils.googleOAuth2Client.setCredentials(tokens);

        const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
        const user = await utils.googleOAuth2Client.request({url});
        
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