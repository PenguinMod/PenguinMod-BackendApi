const path = require('path');
const fs = require('fs');
const jszip = require('jszip');

const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/projects/getproject", async (req, res) => {

        if (!await utils.UserManager.getRuntimeConfigItem("viewingEnabled")) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        
        const requestType = packet.requestType;
        const safe = packet.safe;
        const projectID = String(packet.projectID);
        const token = packet.token;

        if (!requestType) {
            return utils.error(res, 400, "Missing requestType");
        }

        if (!projectID) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 400, "Missing projectId");
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
                    return res.send({ author: "No Author", title: "No Title", public: false }); // TODO: eventually make this return all of the placeholder data, instead of just like 3 things
                default:
                    return utils.error(res, 400, "Invalid requestType");
                }
        }

        if (!await utils.UserManager.projectExists(projectID, true)) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectID);

        const login = await utils.UserManager.loginWithToken(token);

        const is_author = login && metadata.author === login.username;

        if (!is_author && !metadata.public) {
            if (safe) {
                return safeReturn();
            }
            return utils.error(res, 404, "Project not found");
        }

        switch (requestType) {
            case "protobuf":
                const project = await utils.UserManager.getProjectFile(projectID);

                return res.send(project);
            case "assets":
                const assets = await utils.UserManager.getProjectAssets(projectID);


                return res.send(assets);
            case "thumbnail":
                const thumbnail = await utils.UserManager.getProjectImage(projectID);

                if (!thumbnail) {
                    return utils.error(res, 404, "Thumbnail not found");
                }

                res.status(200);
                res.header("Content-Type", "image/png");
                res.header("Cache-Control", "public, max-age=90");
                return res.send(thumbnail);
            case "metadata":
                return res.send(metadata);
            default:
                return utils.error(res, 400, "Invalid requestType");
        }
    }
)};