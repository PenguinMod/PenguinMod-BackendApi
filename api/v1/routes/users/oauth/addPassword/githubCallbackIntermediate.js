module.exports = (app, utils) => {
    app.get("/api/v1/users/githubcallback/addpassword", async function (req, res) {
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
        const response = await utils.UserManager.makeOAuth2Request(code, "github");

        res.status(200);
        res.redirect(`http://localhost:5173/oauthchangepassword?method=github&at=${response.access_token}`); //TODO: add page to on main site or smth for this 
        // TODO: in prod change this to penguinmod.com
    });
}