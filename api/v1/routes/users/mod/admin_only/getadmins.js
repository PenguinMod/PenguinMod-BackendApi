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
    app.get('/api/v1/users/getadmins', utils.cors(), async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            return utils.error(res, 400, "Missing username or token");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Unauthorized");
        }

        const admins = await utils.UserManager.getAllAdmins();

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ admins: admins });
    });
}