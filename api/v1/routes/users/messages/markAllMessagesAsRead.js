/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/markallmessagesasread",
        utils.requireAuth(utils.UserManager, { allow_banned: true }),
        async (req, res) => {
            await utils.UserManager.markAllMessagesAsRead(req.login.id);

            res.header("Content-type", "application/json");
            res.send({ success: true });
        },
    );
};
