module.exports = (app, utils) => {
    app.get('/api/v1/users/setBadges', async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        await utils.UserManager.setBadges(target, packet.badges);

        utils.logs.sendAdminLog(username, target, "Admin has updated user's badges.");

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}