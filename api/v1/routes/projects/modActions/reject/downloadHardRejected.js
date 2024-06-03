module.exports = (app, utils) => {
    app.get('/api/v1/projects/downloadHardReject', async (req, res) => {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const project = String(packet.project);

        if (!username || !token || !project) {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(project, true)) {
            return utils.error(res, 404, "ProjectNotFound");
        }

        const projectMeta = await utils.UserManager.getProjectMetadata(project);
        const userID = await utils.UserManager.getIDByUsername(username);
        const authorID = projectMeta.author.id;

        if (!await utils.UserManager.isAdmin(username) && userID !== authorID) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isHardRejected(project)) {
            return utils.error(res, 400, "NotHardRejected");
        }

        const projectPB = await utils.UserManager.getProjectFile(project);
        const assets = await utils.UserManager.getProjectAssets(project);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ project: projectPB, assets });
    });
}