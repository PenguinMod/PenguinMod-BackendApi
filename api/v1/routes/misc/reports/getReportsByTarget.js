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
    app.get("/api/v1/reports/getReportsByTarget", utils.cors(), async (req, res) => {
        const packet = req.query;

        const token = packet.token;

        const login = await utils.UserManager.loginWithToken(null, token);
        if (!login.success) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }
        const username = login.username;

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 403, "Unauthorized");
        }

        let target = packet.target;
        const page = utils.handle_page(packet.page);

        if (!target) {
            return utils.error(res, 400, "Missing target");
        }

        if (await utils.UserManager.existsByUsername(target)) {
            target = await utils.UserManager.getIDByUsername(target);
        } else {
            if (!await utils.UserManager.projectExists(target)) {
                return utils.error(res, 404, "Target not found");
            }
        }

        const reports = await utils.UserManager.getReportsByReportee(target, page, Number(utils.env.PageSize));

        const final = [];

        for (const report of reports) {
            let pushing = {
                reporter: await utils.UserManager.getUsernameByID(report.reporter),
                target: report.reportee,
                targetID: report.reportee,
                report: report.reason,
                date: report.date,
                type: report.type,
                id: report.id
            }

            if (pushing.type === "user") {
                pushing.target = await utils.UserManager.getUsernameByID(pushing.targetID);
            } else {
                pushing.target = (await utils.UserManager.getProjectMetadata(pushing.targetID)).title;
            }

            final.push(pushing);
        }

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ reports: final });
    });
}