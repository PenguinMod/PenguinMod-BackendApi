module.exports = (app, utils) => {
    app.post('api/v1/projects/softReject', async (req, res) => {
        // use this if you need to tell a certain user something but you're not responding to a dispute or smth
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;
        const message = packet.message;

        if (!username || !token || typeof message !== "string") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.sendMessage(target, message, false);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}