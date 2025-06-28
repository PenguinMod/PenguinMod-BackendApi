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
    app.post("/api/v1/users/logout", utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        if (typeof token !== "string") {
            utils.error(res, 400, "Missing token");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        await utils.UserManager.logout(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}