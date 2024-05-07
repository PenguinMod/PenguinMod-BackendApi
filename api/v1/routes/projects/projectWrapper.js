module.exports = (app, utils) => {
    app.get("/api/v1/projects/getprojectwrapper", async (req, res) => {
        const packet = req.query;

        const projectId = packet.projectId;
        const safe = packet.safe; // TODO: this shit

        if (!projectId) {
            return utils.error(res, 400, "Missing projectId");
        }

        if (!await utils.UserManager.projectExists(projectId, true)) {
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectId);

        if (metadata.author.username !== packet.username && !metadata.public) {
            return utils.error(res, 404, "Project not found");
        }

        if (!await utils.UserManager.hasSeenProject(projectId, req.clientIp)) {
            await utils.UserManager.projectView(projectId, req.clientIp);
        }

        const project = await utils.UserManager.getProjectFile(projectId);
        const assets = await utils.UserManager.getProjectAssets(projectId);

        return res.send({ project, assets });
    });
}