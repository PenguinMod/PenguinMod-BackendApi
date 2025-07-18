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
    app.get('/api/v1/users/getworstoffenders', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;
        const page = Number(packet.page) || 0;

        if (!token) {
            return utils.error(res, 400, "Missing token");
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

        const items = await utils.UserManager.getWorstOffenders(page, Number(utils.env.PageSize) || 20);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ items });
    });
}