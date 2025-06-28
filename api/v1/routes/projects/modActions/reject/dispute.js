const UserManager = require("../../../../db/UserManager");

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
    app.post('/api/v1/projects/dispute', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const messageID = packet.messageID;
        const dispute = packet.dispute;

        if (!token || typeof messageID !== "string" || typeof dispute !== "string") {
            return utils.error(res, 400, "Missing token, messageID, or dispute");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        const message = await utils.UserManager.getMessage(messageID);

        if (!message) {
            return utils.error(res, 404, "MessageNotFound");
        }

        if (!message.disputable) {
            return utils.error(res, 400, "NotDisputable");
        }

        await utils.UserManager.dispute(messageID, dispute);
        
        utils.logs.disputeLog(username, messageID, message.message, dispute, message.projectID);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}