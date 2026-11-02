/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/perfgetworstoffenders",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const page = utils.handle_page(packet.page);

            const items = await utils.UserManager.getWorstOffenders(
                page,
                Number(utils.env.PageSize) || 20,
            );

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ items });
        },
    );
};
