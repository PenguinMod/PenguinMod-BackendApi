/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/reports/deleteReport",
        utils.requireAuth(utils.UserManager, { require_mod: true }),
        async (req, res) => {
            const packet = req.body;

            const reportID = String(packet.reportID);

            if (
                !reportID ||
                !(await utils.UserManager.reportExists(reportID))
            ) {
                return utils.error(res, 404, "Report not found");
            }

            await utils.UserManager.deleteReport(reportID);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true });
        },
    );
};
