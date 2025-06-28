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
    app.get('/api/v1/misc/getProfanityList', utils.cors(), async function (req, res) {
        const packet = req.query;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount")
            return;
        }
        const illegalWords = await utils.UserManager.getIllegalWords();
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(illegalWords);
    });
}