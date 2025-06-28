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
    app.get('/api/v1/projects/getmyprojects', utils.cors(), async (req, res) => {
        const packet = req.query;

        const token = packet.token;

        if (!token) {
            return utils.error(res, 400, "Missing token");
        }

        const login = await utils.UserManager.loginwithtoken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        const page = utils.handle_page(packet.page);

        const authorID = await utils.UserManager.getIDByUsername(username);

        const projects = await utils.UserManager.getProjectsByAuthor(authorID, page, Number(utils.env.PageSize), true, true);

        res.status(200);
        res.header("Content-Type", 'application/json');
        return res.send(projects);
    });
}