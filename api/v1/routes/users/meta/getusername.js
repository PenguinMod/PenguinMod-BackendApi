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
    app.get('/api/v1/users/getusername', async function (req, res) {
        const packet = req.query;

        const ID = packet.ID;

        if (!ID) {
            return utils.error(res, 400, "Missing ID");
        }

        const username = await utils.UserManager.getUsernameByID(ID);

        res.status(200);
        res.header('Content-type', "text/plain");
        res.send({ username: username });
    });
}