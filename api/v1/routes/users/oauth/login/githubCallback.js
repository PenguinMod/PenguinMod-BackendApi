module.exports = (app, utils) => {
    app.get("/api/v1/users/githubcallback/login", async function (req, res) {
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

        const user = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${response.access_token}`
            }
        })
        .then(async res => {
            return {"user": await res.json(), "status": res.status};
        })
        .catch(e => {
            utils.error(res, 500, "OAuthServerDidNotRespond");
            return new Promise();
        })

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            utils.error(res, 500, "OAuthServerError");
            return;
        }

        const userid = await utils.UserManager.getUserIDByOAuthID("github", user.user.id);

        if (!userid) {
            // the method is not connected with an account
            utils.error(res, 400, "MethodNotConnected");
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}