/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/getAllIPs",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target);

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target, true))
            ) {
                return utils.error(res, 404, "User not found");
            }

            const ips = await utils.UserManager.getIPs(target);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ ips });
        },
    );
};
