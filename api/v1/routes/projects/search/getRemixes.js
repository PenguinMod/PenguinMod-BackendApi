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
    app.get('/api/v1/projects/getremixes', async (req, res) => {
        const packet = req.query;

        const projectID = packet.projectID;
        const page = utils.handle_page(packet.page);

        if (!projectID) {
            return utils.error(res, 400, "Missing projectID");
        }

        const projects = await utils.UserManager.getRemixes(projectID, page, Number(utils.env.PageSize));

        return res.send(projects);
    });
}
