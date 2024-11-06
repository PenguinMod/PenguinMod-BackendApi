module.exports = (app, utils) => {
    app.post('/api/v1/users/setBadges', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const badges = packet.badges;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "UserNotFound");
            return;
        }

        if (!Array.isArray(badges)) {
            utils.error(res, 400, "InvalidBadges");
            return;
        }

        await utils.UserManager.setBadges(target, badges);

        utils.logs.sendAdminUserLog(username, target, "Admin has updated user's badges.", 0x3d4ddc, [
            {
                name: "Badges",
                value: badges.join(", ")
            }
        ]);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}