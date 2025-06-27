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

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = packet.target;

        if (!username || !token || !target) {
            utils.error(res, 400, "Missing username, token, or toggle");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        await utils.UserManager.verifyFollowers(target);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}