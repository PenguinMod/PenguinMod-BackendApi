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
        "/api/v1/projects/getWhoVoted",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.query;

            const page = utils.handle_page(packet.page);

            const projectID = String(packet.projectID);

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID, true))
            ) {
                return utils.error(res, 404, "Project not found");
            }

            const votes = await utils.UserManager.getWhoInteracted(
                projectID,
                page,
                Number(utils.env.PageSize),
                "vote",
            );

            return res.send({ votes });
        },
    );
};
