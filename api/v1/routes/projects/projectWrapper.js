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
    app.get("/api/v1/projects/getprojectwrapper", async (req, res) => {
        if (!(await utils.UserManager.getRuntimeConfigItem("viewingEnabled"))) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;

        const projectId = String(packet.projectId);

        if (!projectId) {
            return utils.error(res, 400, "Missing projectId");
        }

        if (!(await utils.UserManager.projectExists(projectId, true))) {
            return utils.error(res, 404, "Project not found");
        }

        const metadata = await utils.UserManager.getProjectMetadata(projectId);

        const login = await utils.UserManager.loginWithToken(
            String(packet.token),
        );
        const is_author =
            login.success && login.username === metadata.author.username;

        if (!is_author) {
            if (
                !metadata.public ||
                /*metadata.softRejected ||*/ metadata.hardReject
            ) {
                return utils.error(res, 404, "Project not found");
            }
        }

        if (
            !(await utils.UserManager.hasSeenProject(projectId, req.clientIp))
        ) {
            await utils.UserManager.projectView(projectId, req.clientIp);
        }

        const project = await utils.UserManager.getProjectFile(projectId);

        const assets = await utils.UserManager.getProjectAssets(projectId);

        return res.send({ project, assets });
    });
};
