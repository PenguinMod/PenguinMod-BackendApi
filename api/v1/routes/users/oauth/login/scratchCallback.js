module.exports = (app, utils) => {
    app.get("/api/v1/users/scratchoauthlogin", async function (req, res) {
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

        if (!response) {
            utils.error(res, 500, "OAuthServerDidNotRespond")
            return;
        }

        const user = await fetch("https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/user", {
            headers: {
                Authorization: `Bearer ${btoa(response.access_token)}`
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

        const userid = await utils.UserManager.getUserIDByOAuthID("scratch", user.user.user_id);

        if (!userid) {
            // the method is not connected with an account
            utils.error(res, 400, "InvalidData");
            return;
        }


        let username;
        try {
            username = await utils.UserManager.getUsernameByID(userid);
        } catch (e) {
            utils.error(res, 500, "This is an error. Please report this stuff: " + JSON.stringify({scratch_id: user.user.user_id, userid: userid}));
            return;
        }

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}