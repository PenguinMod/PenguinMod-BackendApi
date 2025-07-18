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
    app.post('/api/v1/users/changeusernameadmin', utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const newUsername = (String(packet.newUsername)).toLowerCase();

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

        if (await utils.UserManager.existsByUsername(newUsername, true)) {
            utils.error(res, 400, "UsernameInUse");
            return;
        }

        await utils.UserManager.changeUsername(target, newUsername);

        utils.logs.sendAdminUserLog(username, newUsername, `Admin or mod has updated user's username.`, 0xf47420, [
            {
                name: "Old Username",
                value: target
            },
            {
                name: "New Username",
                value: newUsername
            }
        ]);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}