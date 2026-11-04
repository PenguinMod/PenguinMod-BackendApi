/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/projects/getprojects",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            if (
                !(await utils.UserManager.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return utils.error(res, 503, "Viewing is disabled");
            }

            const packet = req.query;
            const page = utils.handle_page(packet.page);
            const reverse = String(packet.reverse || false) === "true";

            const is_mod = req.login && req.login.isMod;

            const projects = await utils.UserManager.getProjects(
                is_mod,
                page,
                Number(utils.env.PageSize),
                null,
                reverse,
            );

            for (const project of projects) {
                await utils.UserManager.addImpression(project.id);
            }

            res.status(200).json(projects);
        },
    );
};
