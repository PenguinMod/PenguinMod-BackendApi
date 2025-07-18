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
    app.post('/api/v1/projects/modresponse', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const disputeID = packet.disputeID;
        const message = packet.message;

        if (!token || typeof disputeID !== "string" || typeof message !== "string") {
            return utils.error(res, 400, "Missing token, disputeID, or message");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.hasModPerms(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        const dispute = await utils.UserManager.getMessage(disputeID);

        if (!dispute) {
            return utils.error(res, 404, "MessageNotFound");
        }

        const id = await utils.UserManager.sendMessage(dispute.receiver, {type: "disputeResponse", message}, true, dispute.projectID);

        const disputer = await utils.UserManager.getUsernameByID(dispute.receiver);

        utils.logs.modResponse(username, disputer, id, dispute.dispute, message);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}