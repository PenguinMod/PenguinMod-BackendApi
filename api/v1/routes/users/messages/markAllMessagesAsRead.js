const UserManager = require("../../../db/UserManager");

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
    app.post('/api/v1/users/markallmessagesasread', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        const id = login.id;

        await utils.UserManager.markAllMessagesAsRead(id);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}