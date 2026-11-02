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
        "/api/v1/misc/markPrivacyPolicyAsRead",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            await utils.UserManager.markPrivacyPolicyAsRead(req.login.username);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ success: true });
        },
    );
};
