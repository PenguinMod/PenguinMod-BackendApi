const UserManager = require("../../../../db/UserManager");

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
    app.get('/api/v1/projects/downloadHardReject', utils.cors(), async (req, res) => {
        const packet = req.query;

        const token = packet.token;

        const project = String(packet.project);

        if (!token || !project) {
            return utils.error(res, 400, "Missing token or project");
        }

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.projectExists(project, true)) {
            return utils.error(res, 404, "ProjectNotFound");
        }

        const projectMeta = await utils.UserManager.getProjectMetadata(project);
        const userID = await utils.UserManager.getIDByUsername(username);
        const authorID = projectMeta.author.id;

        if (!await utils.UserManager.isAdmin(username) && userID !== authorID) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isHardRejected(project)) {
            return utils.error(res, 400, "NotHardRejected");
        }

        const projectPB = await utils.UserManager.getProjectFile(project);
        const assets = await utils.UserManager.getProjectAssets(project);

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ project: projectPB, assets });
    });
}