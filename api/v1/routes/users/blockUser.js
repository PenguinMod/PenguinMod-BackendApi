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
    app.post('/api/v1/users/blockuser', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const user_id = login.id;

        const target = packet.target;

        if (!target || !await utils.UserManager.existsByUsername(target))
            return utils.error(res, 404, "Target not found");

        const target_id = await utils.UserManager.getIDByUsername(target);

        if (user_id === target_id) {
            return utils.error(res, 401, "Cannot block yourself")
        }

        const active = Boolean(packet.active);

        await utils.UserManager.blockUser(user_id, target_id, active);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}