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
    app.get('/api/v1/projects/getprojects', async (req, res) => {
        if (!await utils.UserManager.getRuntimeConfigItem("viewingEnabled")) {
            return utils.error(res, 503, "Viewing is disabled");
        }

        const packet = req.query;
        const page = utils.handle_page(packet.page);
        const reverse = String(packet.reverse || false) === "true";

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token, false);
        const is_mod = login.success && await utils.UserManager.isModerator(login.username);

        const projects = await utils.UserManager.getProjects(is_mod, page, Number(utils.env.PageSize), Number(utils.env.MaxPageSize), null, reverse);

        for (const project of projects) {
            await utils.UserManager.addImpression(project.id);
        }

        res.status(200);
        res.setHeader('Content-Type', 'application/json');
        return res.send(projects);
    }
)}