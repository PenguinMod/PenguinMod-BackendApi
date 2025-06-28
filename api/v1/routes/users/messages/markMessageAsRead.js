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
    app.post('/api/v1/users/markmessageasread', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const messageID = packet.messageID;

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        if (!await utils.UserManager.messageExists(messageID)) {
            return utils.error(res, 400, "Invalid message ID");
        }

        await utils.UserManager.markMessageAsRead(messageID, true);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}