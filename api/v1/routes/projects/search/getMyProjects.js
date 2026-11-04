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
        "/api/v1/projects/getmyprojects",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.query;

            const authorID = req.login.id;

            const page = utils.handle_page(packet.page);

            const projects = await utils.UserManager.getProjectsByAuthor(
                authorID,
                page,
                Number(utils.env.PageSize),
                true,
                true,
            );

            res.status(200).json(projects);
        },
    );
};
