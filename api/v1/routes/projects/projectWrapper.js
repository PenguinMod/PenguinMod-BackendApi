const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

module.exports = (app, utils) => {
    app.get("/api/v1/projects/getprojectwrapper", async (req, res) => {
        if (!await utils.UserManager.getRuntimeConfigItem("viewingEnabled")) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;

        const projectId = String(packet.projectId);
        const safe = packet.safe;

        const safeReturn = () => {
            const project = fs.readFileSync(path.join(utils.homeDir, "NoProjectFound.pmp"));
            const assets = fs.readFileSync(path.join(utils.homeDir, "NoProjectFound.pmp"));

            jszip.loadAsync(project).then(async (zip) => {
                const file = zip.file("project.json");
                const json = JSON.parse(await file.async("text"));
                const protobuf = utils.UserManager.projectJsonToProtobuf(json);

                jszip.loadAsync(assets).then(async (zip) => {
                    const assets = []
                    for (let [filename, file] of Object.entries(zip.files)) {
                        if (filename !== "project.json") {
                            const buffer = await file.async("nodebuffer");
                            assets.push({ id: filename, buffer });
                        }
                    }
    
                    res.send({ project: protobuf, assets });
                });
            });
        }

        if (!projectId) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 400, "Missing projectId");
        }

        if (!await utils.UserManager.projectExists(projectId, true)) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectId);

        if (metadata.author.username !== String(packet.username).toLowerCase() && !metadata.public) {
            if (safe) {
                return safeReturn();
            }
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