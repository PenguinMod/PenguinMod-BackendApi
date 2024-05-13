module.exports = (app, utils) => {
    app.post('/api/v1/users/restore', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = packet.project;

        if (!username || !token || typeof project !== "number") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(project)) {
            return utils.error(res, 404, "ProjectNotFound");
        }

        if (!await utils.UserManager.isSoftRejected(project)) {
            return utils.error(res, 400, "AlreadySoftRejected");
        }

        await utils.UserManager.softReject(project, false);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}