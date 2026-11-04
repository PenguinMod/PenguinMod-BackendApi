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
    app.post(
        "/api/v1/users/markallmessagesasread",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async (req, res) => {
            await utils.UserManager.markAllMessagesAsRead(req.login.id);

            res.status(200).json({ success: true });
        },
    );
};
