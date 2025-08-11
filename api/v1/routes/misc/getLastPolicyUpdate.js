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
    app.get('/api/v1/misc/getLastPolicyUpdate', async function (req, res) {
        const lastPolicyUpdate = await utils.UserManager.getLastPolicyUpdate();

        res.status(200);
        res.header("Content-Type", "application/json");
        res.json(lastPolicyUpdate); // its already an object
    });
}