module.exports = (app, utils) => {
    app.post('/api/v1/users/privateFollowSettings', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = String(packet.username).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "Reauthenticate");
            return;
        }

        const profileHideFollowing = packet.profileHideFollowing;
        const profileHideFollowers = packet.profileHideFollowers;

        if (typeof profileHideFollowing !== "boolean" || typeof profileHideFollowers !== "boolean") {
            utils.error(res, 400, "InvalidBody")
            return;
        }

        await utils.UserManager.setProfileHideFollowing(username, profileHideFollowing);
        await utils.UserManager.setProfileHideFollowers(username, profileHideFollowers);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}