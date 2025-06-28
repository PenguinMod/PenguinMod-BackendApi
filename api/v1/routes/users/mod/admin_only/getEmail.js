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
    app.get('/api/v1/users/getemail', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        if (!token || !target) {
            return utils.error(res, 400, "Missing token or target");
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Unauthorized");
        }

        const email = await utils.UserManager.getEmail(target);

        if (!email) {
            return utils.error(res, 404, "UserNotFound");
        }

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ email });
    });
}