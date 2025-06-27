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
    app.post('/api/v1/misc/markTOSAsRead', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        await utils.UserManager.markTOSAsRead(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ success: true });
    });
}