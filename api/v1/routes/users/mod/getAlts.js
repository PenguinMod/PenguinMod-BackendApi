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
    app.get('/api/v1/users/getAlts', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

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

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target, true)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        const alts = await utils.UserManager.getAlts(targetID);
        const usernames = await utils.UserManager.idListToUsernames(alts);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ alts: usernames });
    });
}