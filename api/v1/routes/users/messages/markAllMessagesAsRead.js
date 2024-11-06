module.exports = (app, utils) => {
    app.post('/api/v1/users/markallmessagesasread', async (req, res) => {
        // use this if you need to tell a certain user something but you're not responding to a dispute or smth
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const id = await utils.UserManager.getIDByUsername(username);
        await utils.UserManager.markAllMessagesAsRead(id);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}