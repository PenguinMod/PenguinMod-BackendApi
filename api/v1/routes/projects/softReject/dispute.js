module.exports = (app, utils) => {
    app.post('/api/v1/projects/dispute', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const messageID = packet.messageID;
        const dispute = packet.dispute;

        if (!username || !token || typeof messageID !== "string" || typeof dispute !== "string") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const message = await utils.UserManager.getMessage(messageID);

        if (!message) {
            return utils.error(res, 404, "MessageNotFound");
        }

        if (!message.disputable) {
            return utils.error(res, 400, "NotDisputable");
        }

        await utils.UserManager.dispute(messageID, dispute);
    });
}