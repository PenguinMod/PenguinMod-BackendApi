import { Application } from "express";
import { requireAuth } from "../../../../../utils/auth";
import { Utils } from "../../../../../index";
import { handle_page } from "../../../../../utils/misc";
import { isValid } from "ulid";
import { makeUsername, ProjectId, UserId, userId } from "../../../db/new-types";
import { ReportResponse } from "./getReports";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/reports/getReportsByTarget",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res): Promise<void> {
            const packet = req.query;

            const target = String(packet.target);
            const page = handle_page(packet.page);

            const targetId = isValid(target)
                ? userId(target) // NOTE: this could be a project or a user, but in this case it doesn't really matter that we only cast it to one
                : (await utils.manager.users.getUserData(makeUsername(target)))
                      ?.id;

            if (!targetId) {
                res.status(404).json({ error: "InvalidID" });
                return;
            }

            const reports = await utils.manager.reports.getReportsByReportee(
                targetId,
                page,
                Number(process.env.PageSize),
            );

            const final: ReportResponse[] = [];

            for (const report of reports) {
                const pushing = {
                    reporter: report.reporter,
                    target: "",
                    targetID: report.reportee,
                    report: report.reason,
                    date: report.date,
                    type: report.type,
                    id: report.id,
                    author: "",
                };

                // TODO: maybe move this into db query?
                if (pushing.type === "user") {
                    pushing.target =
                        (
                            await utils.manager.users.getUserDataByID(
                                pushing.targetID as UserId,
                            )
                        )?.username || "";
                } else {
                    const metadata =
                        await utils.manager.projects.getProjectMetadata(
                            pushing.targetID as ProjectId,
                        );

                    if (!metadata) {
                        await utils.manager.reports.resolveReport(pushing.id);
                        continue;
                    }

                    pushing.target = metadata.title;
                    pushing.author = metadata.author.username;
                }

                final.push(pushing);
            }

            res.status(200).json({ reports: final });
        },
    );
}
