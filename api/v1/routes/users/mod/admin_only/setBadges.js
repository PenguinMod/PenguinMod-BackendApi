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
    app.post(
        "/api/v1/users/setBadges",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const badges = packet.badges;

            const username = req.login.username;

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target))
            ) {
                utils.error(res, 404, "UserNotFound");
                return;
            }

            if (!Array.isArray(badges)) {
                utils.error(res, 400, "InvalidBadges");
                return;
            }

            await utils.UserManager.setBadges(target, badges);

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin has updated user's badges.",
                0x3d4ddc,
                [
                    {
                        name: "Badges",
                        value: badges.join(", "),
                    },
                ],
            );

            res.status(200).json({ success: true });
        },
    );
};
