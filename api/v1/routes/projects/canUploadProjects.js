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
    app.get('/api/v1/projects/canuploadprojects', async (req, res) => {
        const canUpload = await utils.UserManager.getRuntimeConfigItem("uploadingEnabled");

        return res.send({ canUpload });
    });
}