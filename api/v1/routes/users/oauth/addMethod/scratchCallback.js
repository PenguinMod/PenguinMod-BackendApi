module.exports = (app, utils) => {
    app.get("/api/v1/users/addscratchlogin", async function (req, res) {
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

        const userid = state.split("_")[1]; // get the userid from the state (kinda hacky but erm shit the flip up)

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(code, "scratch");

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
            utils.error(res, 500, "InternalError");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (methods.includes("scratch")) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        await utils.UserManager.addOAuthMethod(username, "scratch", user.user.user_id);

        const token = await utils.UserManager.newTokenGen(username);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}