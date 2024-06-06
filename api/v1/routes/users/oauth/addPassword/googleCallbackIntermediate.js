module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/addpassword", async function (req, res) {
        const packet = req.query;

        const state = packet.state;
        const code = packet.code;

        if (!state || !code) {
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
            `${utils.env.ApiURL}/api/v1/users/googlecallback/addpassword`
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

        res.status(200);
        res.redirect(`${utils.env.HomeURL}/oauthchangepasswordintermediate?method=google&at=${JSON.stringify(tokens)}`);
        // BTODO: in prod change this to penguinmod.com
    });
}