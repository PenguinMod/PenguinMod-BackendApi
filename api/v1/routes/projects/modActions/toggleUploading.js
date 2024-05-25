module.exports = (app, utils) => {
    app.post('/api/v1/projects/toggleuploading', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const toggle = packet.toggle;

        if (!username || !token || !toggle) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        utils.env.UploadingEnabled = toggle;

        // TODO: send log

        return res.send({ success: true });
    });
}