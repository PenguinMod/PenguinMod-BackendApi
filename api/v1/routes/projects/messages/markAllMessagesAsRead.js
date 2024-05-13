module.exports = (app, utils) => {
    app.post('/api/v1/users/sendmessage', async (req, res) => {
        // use this if you need to tell a certain user something but you're not responding to a dispute or smth
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.markAllMessagesAsRead(username);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}