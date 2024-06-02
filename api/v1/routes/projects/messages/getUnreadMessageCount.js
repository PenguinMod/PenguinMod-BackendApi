module.exports = (app, utils) => {
    app.get('/api/v1/users/getunreadmessagecount', async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const count = await utils.UserManager.getUnreadMessageCount(id);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ count: count });
    });
}