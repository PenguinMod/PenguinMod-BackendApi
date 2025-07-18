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
    app.get('/api/v1/projects/getfeaturedprojects', async (req, res) => {
        const packet = req.query;

        const page = utils.handle_page(packet.page);

        const projects = await utils.UserManager.getFeaturedProjects(page, Number(utils.env.PageSize));

        return res.send(projects);
    });
}