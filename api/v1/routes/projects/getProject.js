/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/getproject",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            if (
                !(await utils.UserManager.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return utils.error(res, 503, "Viewing is disabled");
            }

            const packet = req.query;

            const requestType = String(packet.requestType);
            const projectID = String(packet.projectID);

            if (!requestType) {
                return utils.error(res, 400, "Missing requestType");
            }

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID, true))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            const metadata =
                await utils.UserManager.getProjectMetadata(projectID);

            const is_author =
                req.login && metadata.author === req.login.username;
            const is_mod = req.login && req.login.isMod;

            if (
                ((!is_author && !metadata.public) || metadata.hardReject) &&
                !is_mod
            ) {
                return utils.error(res, 404, "Project not found");
            }

            switch (requestType) {
                case "protobuf": {
                    // views get checked here because projects have to be gotten from here
                    // or projectwrapper but we don't use that rn
                    const has_seen = await utils.UserManager.hasSeenProject(
                        projectID,
                        req.clientIp,
                    );

                    if (!has_seen) {
                        await utils.UserManager.projectView(
                            projectID,
                            req.clientIp,
                        );
                    }

                    const project =
                        await utils.UserManager.getProjectFile(projectID);

                    res.status(200);
                    res.header("Content-Type", "application/json");
                    return res.send(project);
                }
                case "assets": {
                    const assets =
                        await utils.UserManager.getProjectAssets(projectID);

                    res.header("Cache-Control", "public, max-age=90");
                    return res.send(assets);
                }
                case "thumbnail": {
                    const thumbnail =
                        await utils.UserManager.getProjectImage(projectID);

                    if (!thumbnail) {
                        return utils.error(res, 404, "Thumbnail not found");
                    }

                    res.status(200);
                    res.header("Content-Type", "image/png");
                    res.header("Cache-Control", "public, max-age=90");
                    return res.send(thumbnail);
                }
                case "metadata":
                    return res.send(metadata);
                default:
                    return utils.error(res, 400, "Invalid requestType");
            }
        },
    );
};
