module.exports = (app, utils) => {
    app.post('api/v1/projects/getmessages', async (req, res) => {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const page = Number(packet.page) || 0;

        if (!username || !token) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const messages = await utils.UserManager.getMessages(username, page, Number(utils.env.PageSize));

        res.header('Content-type', "application/json");
        res.send({ success: true, messages: messages });
    });
}