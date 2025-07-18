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
    app.post('/api/v1/projects/modmessage', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const target = packet.target;
        const message = packet.message;

        const disputable = packet.disputable || false;

        if (!token || !target || typeof message !== "string") {
            return utils.error(res, 400, "Missing token, target, or message");
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

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 404, "UserNotFound");
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        const id = await utils.UserManager.sendMessage(targetID, {type: "modMessage", message}, disputable, 0);

        utils.logs.modMessage(username, target, id, message);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}