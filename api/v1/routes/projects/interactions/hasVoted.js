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
    app.get('/api/v1/projects/hasVoted', utils.cors(), async (req, res) => {
        const packet = req.query;
        
        const token = packet.token;

        const projectID = packet.projectID;

        if (!token || !projectID) {
            return utils.error(res, 400, "Missing token or projectID");
        }

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const has = await utils.UserManager.hasVotedProject(projectID, id);

        return res.send({ hasVoted: has });
    });
}