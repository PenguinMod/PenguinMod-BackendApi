const UserManager = require("../../db/UserManager");

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
    app.get('/api/v1/users/hasblocked', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;

        const target = String(packet.target).toLowerCase();

        if (!target || !await utils.UserManager.existsByUsername(target))
            return utils.error(res, 404, "Target not found");

        const user_id = await utils.UserManager.getIDByUsername(username);
        const target_id = await utils.UserManager.getIDByUsername(target);

        const has_blocked = await utils.UserManager.hasBlocked(user_id, target_id);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ has_blocked });
    });
}