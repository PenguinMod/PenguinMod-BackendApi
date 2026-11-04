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
                return utils.error(res, 400, "Missing projectID, or target");
            }

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
            }

            const id = await utils.UserManager.getIDByUsername(target, false);
            if (!id) {
                return utils.error(res, 404, "UserNotFound");
            }

            const has = await utils.UserManager.hasVotedProject(projectID, id);

            return res.send({ hasVoted: has });
        },
    );
};
