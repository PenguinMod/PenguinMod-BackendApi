module.exports = (app, utils) => {
    app.get('/api/v1/users/setBadges', async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;

        if (!await utils.UserManager.loginWithToken(token, username)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        await utils.UserManager.setBadges(target, packet.badges);
    });
}