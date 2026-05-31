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
    app.post(
        "/api/v1/projects/fixprojectstats",
        utils.cors(),
        async (req, res) => {
            const packet = req.body;

            const token = String(packet.token);
            const projectID = String(packet.projectID);

            if (!token || typeof projectID !== "string") {
                return utils.error(res, 400, "Missing token or projectID");
            }

            const login = await utils.UserManager.loginWithToken(token);
            if (!login.success) {
                utils.error(res, 401, "Reauthenticate");
                return;
            }
            const isAdmin = login.isAdmin;

            if (!isAdmin) {
                return utils.error(res, 401, "Invalid credentials");
            }

            if (!(await utils.UserManager.projectExists(projectID))) {
                return utils.error(res, 404, "Project not found");
            }

            await utils.UserManager.fixProjectStats(projectID);

            return res.send({ success: true });
        },
    );
};
