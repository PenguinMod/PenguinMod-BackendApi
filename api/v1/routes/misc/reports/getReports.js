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
    app.get("/api/v1/reports/getReports", utils.cors(), async (req, res) => {
        const packet = req.query;

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

        const type = packet.type;
        const page = utils.handle_page(packet.page);

        const reports = type ?
                        await utils.UserManager.getReportsByType(type, page, Number(utils.env.PageSize)) :
                        await utils.UserManager.getReports(page, Number(utils.env.PageSize))
        
        const final = [];

        for (const report of reports) {
            let pushing = {
                reporter: await utils.UserManager.getUsernameByID(report.reporter),
                target: report.reportee,
                targetID: report.reportee,
                report: report.reason,
                author: "",
                date: report.date,
                type: report.type,
                id: report.id
            }

            if (pushing.type === "user") {
                pushing.target = await utils.UserManager.getUsernameByID(pushing.targetID);
            } else {
                const metadata = await utils.UserManager.getProjectMetadata(pushing.targetID);

                if (!metadata) {
                    continue;
                }

                pushing.target = metadata.title;
                pushing.author = metadata.author.username;
            }

            final.push(pushing);
        }
        
        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ reports: final });
    });
}