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
    app.get('/api/v1/users/getid', async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();

        if (!username) {
            return utils.error(res, 400, "Missing username");
        }

        const id = await utils.UserManager.getIDByUsername(username, false);

        if (!id) {
            return utils.error(res, 404, "UserNotFound");
        }

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ id: id });
    });
}