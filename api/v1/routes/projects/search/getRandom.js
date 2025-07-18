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
    app.get('/api/v1/projects/getrandomproject', async (req, res) => {
        const project = await utils.UserManager.getRandomProjects(1);

        res.status(200);
        res.header("Content-Type", 'application/json');
        return res.send(project.length > 0 ? project[0] : {});
    });
}