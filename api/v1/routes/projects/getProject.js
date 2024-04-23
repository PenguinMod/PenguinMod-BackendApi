module.exports = (app, utils) => {
    app.get('/api/v1/projects/getProject', async (req, res) => {
        if (!utils.env.ViewingEnabled) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        
        const requestType = packet.requestType;

        if (!requestType) {
            return utils.error(res, 400, "Missing requestType");
        }

        if (!packet.projectId) {
            return utils.error(res, 400, "Missing projectId");
        }

        if (!await utils.UserManager.projectExists(packet.projectId)) {
            return utils.error(res, 404, "Project not found");
        }

        if (!await utils.UserManager.hasSeenProject(packet.projectId, req.clientIp)) {
            await utils.UserManager.projectView(packet.projectId, req.clientIp);
        }

        switch (requestType) {
            case "protobuf":
                const project = await utils.UserManager.getProjectFile(packet.projectId);

                return res.send(project);
            case "assets":
                const assets = await utils.UserManager.getProjectAssets(packet.projectId);

                return res.send(assets);
            case "thumbnail":
                const thumbnail = await utils.UserManager.getProjectThumbnail(packet.projectId);

                return res.send(thumbnail);
            case "metadata":
                const metadata = await utils.UserManager.getProjectMetadata(packet.projectId);

                return res.send(metadata);
            default:
                return utils.error(res, 400, "Invalid requestType");
        }
    }
)};