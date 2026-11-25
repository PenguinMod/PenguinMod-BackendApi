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
        "/api/v1/users/logout",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            await utils.UserManager.logout(req.login.username);

            res.status(200).json({ success: true });
        },
    );
};
