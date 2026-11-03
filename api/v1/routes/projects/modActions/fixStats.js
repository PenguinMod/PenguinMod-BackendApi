/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/projects/fixprojectstats",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const projectID = String(packet.projectID);

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
            }

            await utils.UserManager.fixProjectStats(projectID);

            res.status(200).json({ success: true });
        },
    );
};
