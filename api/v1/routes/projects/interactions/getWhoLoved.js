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
    app.get('/api/v1/projects/getWhoLoved', utils.cors(), async (req, res) => {
        const packet = req.query;
        
        const token = packet.token;

        const page = utils.handle_page(packet.page);

        const projectID = packet.projectID;

        if (!token || !projectID || typeof page !== "number") {
            return utils.error(res, 400, "Missing token, projectID, or page");
        }

        const login = await utils.UserManager.loginwithtoken(token);
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

        const loves = await utils.UserManager.getWhoLoved(projectID, page, Number(utils.env.PageSize));

        // convert to usernames
        const usernames = [];
        for (const love of loves) {
            const username = await utils.UserManager.getUsernameByID(love);
            usernames.push(username);
        }

        return res.send({ loves: usernames });
    });
}