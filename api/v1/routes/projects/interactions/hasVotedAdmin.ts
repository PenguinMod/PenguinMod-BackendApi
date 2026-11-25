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
    app.get(
        "/api/v1/projects/hasVotedAdmin",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const projectID = String(packet.projectID);

            if (!projectID || !target) {
                return res
                    .status(400)
                    .json({ error: "Missing projectID, or target" });
            }

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const id = await utils.UserManager.getIDByUsername(target, false);
            if (!id) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            const has = await utils.UserManager.hasVotedProject(projectID, id);

            return res.send({ hasVoted: has });
        },
    );
};
