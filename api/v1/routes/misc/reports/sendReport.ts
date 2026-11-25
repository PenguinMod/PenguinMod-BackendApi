import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId, ProjectId, userId, UserId } from "../../../db/new-types";
import { sendMultiReportLog, sendReportLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/reports/sendReport",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const username = res.locals.login.username;
            const reporterID = res.locals.login.id;

            const report = String(packet.report);
            let target = String(packet.target).toLowerCase();
            const type = String(packet.type);

            if (!report || !type) {
                return res.status(400).json({ error: "Invalid request" });
            }

            let targetID: UserId | ProjectId;

            switch (type) {
                case "user": {
                    const data = await utils.manager.users.getUserData(target);
                    if (!data) {
                        return res
                            .status(404)
                            .json({ error: "User not found" });
                    }
                    targetID = data.id;
                    break;
                }
                case "project": {
                    targetID = projectId(target);
                    const meta =
                        await utils.manager.projects.getProjectMetadata(
                            targetID,
                        );
                    if (!meta) {
                        return res
                            .status(404)
                            .json({ error: "Project not found" });
                    }

                    target = meta.title;
                    break;
                }
                default:
                    return res.status(400).json({ error: "InvalidType" });
            }

            if (
                await utils.manager.reports.hasAlreadyReported(
                    reporterID,
                    targetID,
                )
            ) {
                res.status(200).json({ success: true });

                const server_id = userId("Server");
                if (
                    await utils.manager.reports.hasAlreadyReported(
                        server_id,
                        reporterID,
                    )
                ) {
                    return;
                }

                await utils.manager.reports.report(
                    "user",
                    reporterID,
                    `User has sent multiple reports on same ${type}.`,
                    server_id,
                );

                // TODO: investigate whether this actually works correctly or not
                sendMultiReportLog(
                    username,
                    reporterID,
                    target,
                    targetID,
                    report,
                );
                return;
            }

            await utils.manager.reports.report(
                type,
                targetID,
                report,
                reporterID,
            );

            sendReportLog(type, username, targetID, target, report);

            res.status(200).json({ success: true });
        },
    );
}
