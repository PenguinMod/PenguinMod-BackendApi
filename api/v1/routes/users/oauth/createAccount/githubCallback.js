const fs = require('fs');

module.exports = (app, utils) => {
    app.get("/api/v1/users/githubcallback/createaccount", async function (req, res) {
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

        const response = await utils.UserManager.makeOAuth2Request(code, "github");

        const username = await fetch("https://api.github.com/user", {
            headers: {
                Authorization: `Bearer ${response.access_token}`
            }
        })
        .then(async res => {
            return {"user": await res.json(), "status": res.status};
        });

        if (username.status !== 200) {
            utils.error(res, 500, "InternalError");
            return;
        }

        if (await utils.UserManager.getUserIDByOAuthID("github", username.user.id)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        const userdata = await utils.UserManager.makeOAuth2Account("github", username.user);

        const profilePicture = await fetch(`https://github.com/${username.user.login.toLowerCase()}.png`).then(res => res.arrayBuffer());

        await utils.UserManager.setProfilePicture(userdata.username, profilePicture);

        const accountUsername = userdata.username;
        const token = userdata.token;

        res.status(200);
        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${accountUsername}`);
    });
}