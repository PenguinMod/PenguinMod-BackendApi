module.exports = (app, utils) => {
    app.post('/api/v1/projects/softreject', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = packet.project;
        const message = packet.message;

        if (!username || !token || typeof project !== "number" || typeof message !== "string") {
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

        if (await utils.UserManager.isSoftRejected(project)) {
            return utils.error(res, 400, "AlreadySoftRejected");
        }

        await utils.UserManager.softReject(project, true);

        const projectData = await utils.UserManager.getProjectMetadata(project);

        await utils.UserManager.sendMessage(projectData.author.id, message, true, project);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}