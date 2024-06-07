export default (app, utils) => {
    app.post('/api/v1/reports/sendReport', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        const report = packet.report;
        const target = String(packet.target).toLowerCase();
        const type = packet.type;

        if (!report || !type) {
            return utils.error(res, 400, "Invalid request");
        }

        const allowedTypes = ["user", "project"]

        if (!allowedTypes.includes(type)) {
            return utils.error(res, 400, "Invalid type");
        }

        let targetID = target;

        if (type === "user") {
            if (!await utils.UserManager.existsByUsername(target)) {
                return utils.error(res, 404, "User not found");
            }

            targetID = await utils.UserManager.getIDByUsername(target);
        } else if (type == "project" && !await utils.UserManager.projectExists(target)) {
            return utils.error(res, 404, "Project not found");
        }

        const reporterID = await utils.UserManager.getIDByUsername(username);

        if (await utils.UserManager.hasAlreadyReported(reporterID, targetID)) {
            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true }); // so they think its working

            if (await utils.UserManager.hasAlreadyReported("Server", reporterID)) return;

            await utils.UserManager.report("MultiReport", reporterID, `User has sent multiple reports on same ${type}.`, "Server");

            utils.logs.sendMultiReportLog(username, reporterID, target, targetID, report);
            return;
        }

        await utils.UserManager.report(type, targetID, report, reporterID);

        utils.logs.sendReportLog(type, username, targetID, target, report);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ success: true });
    });
}