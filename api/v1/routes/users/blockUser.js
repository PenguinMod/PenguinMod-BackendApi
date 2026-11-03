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
    app.post(
        "/api/v1/users/blockuser",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const user_id = req.login.id;

            const target = String(packet.target);

            const target_id = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!target_id) {
                return utils.error(res, 404, "Target not found");
            }

            if (user_id === target_id) {
                return utils.error(res, 401, "Cannot block yourself");
            }

            const active = String(packet.active) === "true";

            await utils.UserManager.blockUser(user_id, target_id, active);

            res.status(200).json({ success: true });
        },
    );
};
