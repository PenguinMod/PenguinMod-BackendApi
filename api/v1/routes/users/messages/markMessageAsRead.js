export default (app, utils) => {
    app.post('/api/v1/users/markmessageasread', async (req, res) => {
        // use this if you need to tell a certain user something but you're not responding to a dispute or smth
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const messageID = packet.messageID;

        if (!username || !token) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.messageExists(messageID)) {
            return utils.error(res, 400, "Invalid message ID");
        }

        await utils.UserManager.markMessageAsRead(messageID, true);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}