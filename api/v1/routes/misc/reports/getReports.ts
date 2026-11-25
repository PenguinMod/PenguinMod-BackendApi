import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth, type AuthHandler } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";
import { ExtReport } from "../../../db/types";
import { ProjectId, UserId } from "../../../db/new-types";

type ReportResponse = {
    reporter: ExtReport["reporter"];
    target: string;
    targetID: ExtReport["reportee"];
    report: ExtReport["reason"];
    author: string;
    date: ExtReport["date"];
    type: ExtReport["type"];
    id: ExtReport["id"];
};

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/reports/getReports",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res): Promise<void> {
            const packet = req.query;

            const unsantype = String(packet.type);
            const page = handle_page(packet.page);

            let reports: ExtReport[];

            switch (unsantype) {
                case "project":
                case "user":
                    reports = await utils.manager.reports.getReportsByType(
                        unsantype,
                        page,
                        Number(process.env.PageSize),
                    );
                    break;

                default:
                    reports = await utils.manager.reports.getReports(
                        page,
                        Number(process.env.PageSize),
                    );
            }

            const final: ReportResponse[] = [];

            for (const report of reports) {
                const pushing: ReportResponse = {
                    reporter: report.reporter,
                    target: "",
                    targetID: report.reportee,
                    report: report.reason,
                    author: "",
                    date: report.date,
                    type: report.type,
                    id: report.id,
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
        } satisfies AuthHandler,
    );
}
