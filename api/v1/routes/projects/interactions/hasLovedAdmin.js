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
    app.get('/api/v1/projects/hasLovedAdmin', utils.cors(), async (req, res) => {
        const packet = req.query;
        
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        const projectID = packet.projectID;

        if (!token || !projectID || !target) {
            return utils.error(res, 400, "Missing token, projectID, or target");
        }

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(target);

        const has = await utils.UserManager.hasLovedProject(projectID, id);

        return res.send({ hasLoved: has });
    });
}