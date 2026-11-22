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
        "/api/v1/users/getdisputes",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async function (req, res) {
            const page = utils.handle_page(req.params.page);
            const pageSize = Number(utils.env.PageSize || 20);

            const disputes = utils.UserManager.getRecentDisputes(
                page,
                pageSize,
            );

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ disputes });
        },
    );
};
