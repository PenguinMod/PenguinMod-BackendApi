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
    app.get('/api/v1/projects/getVotes', async (req, res) => {
        const packet = req.query;
        
        const projectID = packet.projectID;

        if (!projectID) {
            return utils.error(res, 400, "InvalidProjectID");
        }

        if (!await utils.UserManager.projectExists(projectID)) {
            return utils.error(res, 404, "Project not found");
        }

        const votes = await utils.UserManager.getProjectVotes(projectID);

        return res.send({ votes: votes });
    });
}