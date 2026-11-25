/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

// TODO: kill this?

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/getprojectwrapper",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            if (
                !(await utils.UserManager.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Viewing is disabled" });
            }

            const packet = req.query;

            const projectId = String(packet.projectId);

            if (!projectId) {
                return res.status(400).json({ error: "Missing projectId" });
            }

            if (!(await utils.UserManager.projectExists(projectId, true))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const metadata =
                await utils.UserManager.getProjectMetadata(projectId);

            const is_author =
                !!req.login && req.login.username === metadata.author.username;

            if (!is_author) {
                if (
                    !metadata.public ||
                    /*metadata.softRejected ||*/ metadata.hardReject
                ) {
                    return res.status(404).json({ error: "Project not found" });
                }
            }

            if (
                !(await utils.UserManager.hasSeenProject(
                    projectId,
                    req.clientIp,
                ))
            ) {
                await utils.UserManager.projectView(projectId, req.clientIp);
            }

            const project = await utils.UserManager.getProjectFile(projectId);

            const assets = await utils.UserManager.getProjectAssets(projectId);

            return res.send({ project, assets });
        },
    );
};
