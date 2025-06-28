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
    app.post('/api/v1/users/sendmessage', utils.cors(), async (req, res) => {
        // use this if you need to tell a certain user something but you're not responding to a dispute or smth
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const message = packet.message;

        if (!token || typeof message !== "string") {
            return utils.error(res, 400, "Missing token or message");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.hasModPerms(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        await utils.UserManager.sendMessage(target, message, false);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}