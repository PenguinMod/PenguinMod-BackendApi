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
    app.get('/api/v1/users/getmessagecount', utils.cors(), async (req, res) => {
        const packet = req.query;

        const token = packet.token;

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const id = await utils.UserManager.getIDByUsername(username);

        const count = await utils.UserManager.getMessageCount(id);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ count: count });
    });
}