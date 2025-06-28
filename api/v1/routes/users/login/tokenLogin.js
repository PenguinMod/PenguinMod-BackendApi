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
    app.get("/api/v1/users/tokenlogin", utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        if (!token) {
            utils.error(res, 400, "Missing token");
            return;
        }

        const login = await utils.UserManager.loginwithtoken(token, true);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true});
    });
}