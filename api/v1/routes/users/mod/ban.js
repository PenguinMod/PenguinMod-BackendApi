module.exports = (app, utils) => {
    app.post('/api/v1/users/ban', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const toggle = packet.toggle;
        const reason = packet.reason;

        if (!username || !token || !target || typeof toggle !== "boolean" || typeof reason !== "string" || reason.length > 512) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        await utils.UserManager.setBanned(target, toggle, reason);

        utils.logs.sendAdminLog(username, target, `Admin or mod has ${toggle ? "" : "un"}banned user.`);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}