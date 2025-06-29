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
    app.post("/api/v1/users/removeoauthmethod", utils.cors(), async function (req, res) {
        // get the method
        const packet = req.body;

        const method = packet.method;
        const token = packet.token;

        if (!method || !token) {
            utils.error(res, 400, "Missing method or token");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (!methods.includes(method)) {
            utils.error(res, 400, "Method not found");
            return;
        }

        await utils.UserManager.removeOAuthMethod(username, method);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}
