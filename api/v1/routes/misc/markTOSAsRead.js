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
        "/api/v1/misc/markTOSAsRead",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            await utils.UserManager.markTOSAsRead(req.login.username);

            res.status(200).json({ success: true });
        },
    );
};
