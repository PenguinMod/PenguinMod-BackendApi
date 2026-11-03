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
        "/api/v1/users/customization/setCustomizationDisabled",
        utils.requireAuth(utils.UserManager, { require_admin: true }),
        async (req, res) => {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const isEnabled = String(packet.toggle) === "true";

            const username = req.login.username;

            await utils.UserManager.setUserCustomizationDisabled(
                target,
                !isEnabled,
            );

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin has updated user's ability to customize their profile.",
                0x8c03fc,
                [
                    {
                        name: "Is Enabled?",
                        value: String(isEnabled),
                    },
                ],
            );

            res.status(200).json({ success: true });
        },
    );
};
