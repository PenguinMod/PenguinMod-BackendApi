/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/interactions/registerView",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const projectID = String(packet.projectID);

            if (!projectID) {
                return utils.error(res, 400, "Missing projectID");
            }

            const id = req.login.id;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            await utils.UserManager.collectAndInteractView(id, concatted);

            res.status(200).json({ success: true });
        },
    );
};
