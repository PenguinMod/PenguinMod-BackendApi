export default (app, utils) => {
    app.get("/api/v1/users/scratchaddpassword", async function (req, res) {
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

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(code, "scratch");

        res.status(200);
        res.redirect(`${utils.env.HomeURL}/oauthchangepasswordintermediate?method=scratch&at=${response.access_token}`);
    });
}