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
                return res.status(400).json({ error: "Missing projectID" });
            }

            const id = req.login.id;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            res.status(200).json({ success: true });
        },
    );
};
