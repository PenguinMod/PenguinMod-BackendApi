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
    app.post('/api/v1/users/assignPossition', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const admin = packet.admin;
        const approver = packet.approver;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 400, "AccountDoesNotExist");
            return;
        }

        const isAdmin = await utils.UserManager.isAdmin(target);
        const isModerator = await utils.UserManager.isModerator(target);

        await utils.UserManager.setAdmin(target, Boolean(admin));
        await utils.UserManager.setModerator(target, Boolean(approver));

        let fields = [];

        if (isAdmin !== admin) {
            fields.push({
                name: "Admin",
                value: `${isAdmin} -> ${admin}`
            });
        }
        if (isModerator !== approver) {
            fields.push({
                name: "Approver",
                value: `${isModerator} -> ${approver}`
            });
        }

        utils.logs.sendAdminUserLog(username, target, "Admin or mod has updated user's permissions.", 0x7f3ddc, fields);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}