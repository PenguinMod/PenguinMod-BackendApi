/**
 * @typedef {Object} Utils
 * @property {import("../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/hasblocked",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const targetMeta = await utils.UserManager.getUserData(target);
            if (!targetMeta) {
                return utils.error(res, 404, "Target not found");
            }

            const user_id = req.login.id;
            const target_id = targetMeta.id;

            const has_blocked = await utils.UserManager.hasBlocked(
                user_id,
                target_id,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ has_blocked });
        },
    );
};
