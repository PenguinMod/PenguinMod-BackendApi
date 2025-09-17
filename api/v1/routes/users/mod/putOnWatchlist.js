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
    app.post('/api/v1/users/putonwatchlist', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const enabled = Boolean(packet.enabled);

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.hasModPerms(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        await utils.UserManager.toggleWatchlist(target, enabled);

        utils.logs.watchlist.putOnWatchlist(target, username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json({ "success": true });
    });
}