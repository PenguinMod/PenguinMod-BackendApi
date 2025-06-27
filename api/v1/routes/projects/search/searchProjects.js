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
    app.get('/api/v1/projects/searchprojects', async (req, res) => {
        const packet = req.query;

        const query = packet.query || "";
        const page = utils.handle_page(packet.page);
        const type = packet.type || "";
        let reverse = packet.reverse || false;

        if (reverse === "false") {
            reverse = false;
        }
        if (reverse === "true") {
            reverse = true;
        }

        const username = packet.username;
        const token = packet.token;

        const is_mod = username && token && await utils.UserManager.loginWithToken(username, token) && await utils.UserManager.isModeratorOrAdmin(username);

        const projects = await utils.UserManager.searchProjects(is_mod, query, type, page, Number(utils.env.PageSize), Number(utils.env.MaxPageSize), reverse);

        for (const project of projects) {
            await utils.UserManager.addImpression(project.id);
        }

        res.status(200);
        res.header({"Content-Type": "application/json"})
        return res.send(projects);
    });
}