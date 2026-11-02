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
        "/api/v1/projects/getWhoLoved",
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

            const loves = await utils.UserManager.getWhoLoved(
                projectID,
                page,
                Number(utils.env.PageSize),
            );

            // convert to usernames
            const usernames = [];
            for (const love of loves) {
                const username = await utils.UserManager.getUsernameByID(love);
                usernames.push(username);
            }
            // TODO: have the getWhoLoved method do this. because this is slow.

            return res.send({ loves: usernames });
        },
    );
};
