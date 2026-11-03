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
        "/api/v1/reports/sendReport",
        utils.requireAuth(utils.UserManager),
        async (req, res) => {
            const packet = req.body;

            const username = req.login.username;
            const reporterID = req.login.id;

            const report = String(packet.report);
            let target = String(packet.target).toLowerCase();
            const type = String(packet.type);

            if (!report || !type) {
                return utils.error(res, 400, "Invalid request");
            }

            const allowedTypes = ["user", "project"];

            if (!allowedTypes.includes(type)) {
                return utils.error(res, 400, "Invalid type");
            }

            let targetID = target;

            if (type === "user") {
                targetID = await utils.UserManager.getIDByUsername(
                    target,
                    false,
                );
                if (!targetID) {
                    return utils.error(res, 404, "User not found");
                }
            } else if (type === "project") {
                if (!(await utils.UserManager.projectExists(target))) {
                    return utils.error(res, 404, "Project not found");
                }

                target = (await utils.UserManager.getProjectMetadata(target))
                    .title;
            }

            if (
                await utils.UserManager.hasAlreadyReported(reporterID, targetID)
            ) {
                res.status(200).json({ success: true });

                if (
                    await utils.UserManager.hasAlreadyReported(
                        "Server",
                        reporterID,
                    )
                ) {
                    return;
                }

                await utils.UserManager.report(
                    "MultiReport",
                    reporterID,
                    `User has sent multiple reports on same ${type}.`,
                    "Server",
                );

                // TODO: investigate whether this actually works correctly or not
                utils.logs.sendMultiReportLog(
                    username,
                    reporterID,
                    target,
                    targetID,
                    report,
                );
                return;
            }

            await utils.UserManager.report(type, targetID, report, reporterID);

            utils.logs.sendReportLog(type, username, targetID, target, report);

            res.status(200).json({ success: true });
        },
    );
};
