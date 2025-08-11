const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post('/api/v1/misc/markPrivacyPolicyAsRead', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        await utils.UserManager.markPrivacyPolicyAsRead(username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ success: true });
    });
}