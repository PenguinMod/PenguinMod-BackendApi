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
    app.post('/api/v1/users/verifyfollowers', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = packet.target;

        if (!token || !target) {
            utils.error(res, 400, "Missing token or target");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        await utils.UserManager.verifyFollowers(target);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}