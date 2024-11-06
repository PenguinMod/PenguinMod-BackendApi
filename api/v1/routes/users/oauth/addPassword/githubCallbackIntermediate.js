module.exports = (app, utils) => {
    app.get("/api/v1/users/githubcallback/addpassword", async function (req, res) {
        const packet = req.query;

        const state = packet.state;
        const code = packet.code;

        if (!state || !code) {
            utils.error(res, 400, "Missing state or code");
            return;
        }

        if (!await utils.UserManager.verifyOAuth2State(state)) {
            utils.error(res, 400, "Invalid state");
            return;
        }

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(code, "github");

        if (!response) {
            utils.error(res, 500, "OAuthServerDidNotRespond")
            return;
        }

        res.status(200);
        res.redirect(`${utils.env.HomeURL}/oauthchangepasswordintermediate?method=github&at=${response.access_token}`);
    });
}