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
    app.post('/api/v1/projects/interactions/registerView', utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const projectID = String(packet.projectID);

        if (!token || !projectID) {
            return utils.error(res, 400, "Missing token, love, or projectID");
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

        const projectMeta = await utils.UserManager.getProjectMetadata(projectID);

        const instructions = projectMeta.instructions;
        const notes = projectMeta.notes;

        const concatted = instructions + "\n\n" + notes;

        await utils.UserManager.collectAndInteractView(id, concatted);
        
        return res.send({ success: true });
    });
}