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
    app.get('/api/v1/users/isBanned', async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        
        if (typeof username != "string") {
            utils.error(res, 400, "InvalidRequest");
            return;
        }

        const isBanned = await utils.UserManager.isBanned(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ isBanned: isBanned });
    });
}