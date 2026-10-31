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
    app.get(
        "/api/v1/projects/hasLoved",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.query;

            const projectID = String(packet.projectID);

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            const id = req.login.id;

            const has = await utils.UserManager.hasLovedProject(projectID, id);

            return res.send({ hasLoved: has });
        },
    );
};
