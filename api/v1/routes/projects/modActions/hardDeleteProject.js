module.exports = (app, utils) => {
    app.post('/api/v1/projects/hardDeleteProject', async (req, res) => {
        const packet = req.body;

        const projectID = packet.projectID;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid username or token");
        }

        if (!projectID) {
            return utils.error(res, 404, "Project not found");
        }

        if (!await utils.UserManager.projectExists(projectID, true)) {
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectID);

        // only admins and the project owner can delete projects, not mods
        if (metadata.author.username !== username || !await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 403, "You are not authorized to delete this project");
        }

        await utils.UserManager.deleteProject(projectID);

        return res.send({ success: true });
    });
}