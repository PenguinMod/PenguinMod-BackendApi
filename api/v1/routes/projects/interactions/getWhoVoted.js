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
                return res.status(404).json({ error: "Project not found" });
            }

            const votes = await utils.UserManager.getWhoInteracted(
                projectID,
                page,
                Number(process.env.PageSize),
                "vote",
            );

            return res.send({ votes });
        },
    );
};
