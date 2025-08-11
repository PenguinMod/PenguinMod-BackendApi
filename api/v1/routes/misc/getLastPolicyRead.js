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
    app.get('/api/v1/misc/getLastPolicyRead', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;
        
        const lastPolicyRead = await utils.UserManager.getLastPolicyRead(username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json(lastPolicyRead); // its already an object
    });
}