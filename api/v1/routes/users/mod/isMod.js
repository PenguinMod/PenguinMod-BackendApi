module.exports = (app, utils) => {
    app.get('/api/v1/users/ismod', async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;

        if (!username || !token || typeof target !== "string") {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Unauthorized");
        }

        const isModerator = await utils.UserManager.isModerator(target);

        res.header('Content-type', "application/json");
        res.send({ success: true, isModerator: isModerator });
    });
}