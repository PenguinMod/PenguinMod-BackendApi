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
    app.post("/api/v1/reports/deleteReport", utils.cors(), async (req, res) => {
        const packet = req.body;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.hasModPerms(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        const reportID = packet.reportID;

        if (!reportID) {
            return utils.error(res, 400, "Missing report ID");
        }

        if (!await utils.UserManager.reportExists(reportID)) {
            return utils.error(res, 404, "Report not found");
        }

        await utils.UserManager.deleteReport(reportID);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}