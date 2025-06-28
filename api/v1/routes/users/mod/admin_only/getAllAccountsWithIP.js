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
    app.get("/api/v1/users/getAllAccountsWithIP", utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const target = packet.target;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        const users = await utils.UserManager.getAllAccountsWithIP(target);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ users });
    });
}
