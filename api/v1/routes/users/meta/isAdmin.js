module.exports = (app, utils) => {
    app.get('/api/v1/users/isadmin', async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;

        const user = packet.user;

        if (!username || !token || typeof user !== "string") {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Unauthorized");
        }

        const isAdmin = await utils.UserManager.isAdmin(user);

        res.header('Content-type', "application/json");
        res.send({ success: true, isAdmin: isAdmin });
    });
}