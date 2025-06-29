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
    app.get('/api/v1/projects/canviewprojects', async (req, res) => {
        const viewing = await utils.UserManager.getRuntimeConfigItem("viewingEnabled");

        return res.send({ viewing: viewing });
    });
}
