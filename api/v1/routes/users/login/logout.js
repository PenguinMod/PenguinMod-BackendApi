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

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (typeof username !== "string" && typeof token !== "string") {
            utils.error(res, 400, "Missing username or token");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            utils.error(res, 401, "Invalid Login");
            return;
        }

        await utils.UserManager.logout(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}