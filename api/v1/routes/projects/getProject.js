const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

module.exports = (app, utils) => {
    app.get('/api/v1/projects/getproject', async (req, res) => {
        if (!utils.env.ViewingEnabled) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        
        const requestType = packet.requestType;

        const safe = packet.safe;

        if (!requestType) {
            return utils.error(res, 400, "Missing requestType");
        }

        const safeReturn = () => {
            switch (requestType) {
                case "protobuf":
                    const project = fs.readFileSync(path.join(utils.homeDir, "NoProjectFound.pmp"));
                    // unzip it, convert the json to a buffer, and send it
                    jszip.loadAsync(project).then(async (zip) => {
                        const file = zip.file("project.json");
                        const json = JSON.parse(await file.async("text"));
                        const protobuf = utils.UserManager.projectJsonToProtobuf(json);

                        res.send(protobuf);
                    });
                    return;
                case "assets":
                    const assets = fs.readFileSync(path.join(utils.homeDir, "NoProjectFound.pmp"));

                    jszip.loadAsync(assets).then(async (zip) => {
                        const assets = []
                        for (let [filename, file] of Object.entries(zip.files)) {
                            if (filename !== "project.json") {
                                const buffer = await file.async("nodebuffer");
                                assets.push({ id: filename, buffer });
                            }
                        }

                        res.send(assets);
                    });
                    return;
                case "thumbnail":
                    const thumbnail = fs.readFileSync(path.join(utils.homeDir, "icon.png"));
                    
                    return res.send(thumbnail);
                case "metadata":
                    return res.send({ author: "No Author", title: "No Title", description: "No Description", public: false });
                default:
                    return utils.error(res, 400, "Invalid requestType");
                }
        }

        if (!packet.projectId) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 400, "Missing projectId");
        }

        if (!await utils.UserManager.projectExists(packet.projectId, true)) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(packet.projectId);

        if (metadata.author !== String(packet.username).toLowerCase() && !metadata.public) {
            if (safe) {
                return safeReturn();
            }
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
                const thumbnail = await utils.UserManager.getProjectImage(packet.projectId);

                return res.send(thumbnail);
            case "metadata":
                return res.send(metadata);
            default:
                return utils.error(res, 400, "Invalid requestType");
        }
    }
)};