/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/downloadHardReject",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.query;

            const project = String(packet.project);

            if (!project) {
                return utils.error(res, 400, "Missing project");
            }

            const isAdmin = req.login.isAdmin;
            const id = req.login.id;

            if (!(await utils.UserManager.projectExists(project, true))) {
                return utils.error(res, 404, "ProjectNotFound");
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(project);
            const authorID = projectMeta.author.id;

            if (!isAdmin || id !== authorID) {
                return utils.error(res, 401, "Invalid credentials");
            }

            if (!(await utils.UserManager.isHardRejected(project))) {
                return utils.error(res, 400, "NotHardRejected");
            }

            const projectPB = await utils.UserManager.getProjectFile(project);
            const assets = await utils.UserManager.getProjectAssets(project);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ project: projectPB, assets });
        },
    );
};
