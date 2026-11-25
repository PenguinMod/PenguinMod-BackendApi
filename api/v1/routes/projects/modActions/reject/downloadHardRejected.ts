/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
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
                return res.status(400).json({ error: "Missing project" });
            }

            const isAdmin = req.login.isAdmin;
            const id = req.login.id;

            if (!(await utils.UserManager.projectExists(project, true))) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(project);
            const authorID = projectMeta.author.id;

            if (!isAdmin && id !== authorID) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            if (!(await utils.UserManager.isHardRejected(project))) {
                return res.status(400).json({ error: "NotHardRejected" });
            }

            const projectPB = await utils.UserManager.getProjectFile(project);
            const assets = await utils.UserManager.getProjectAssets(project);

            res.status(200).json({ project: projectPB, assets });
        },
    );
};
