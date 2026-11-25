import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { reportId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/reports/resolveReport",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const reportID = reportId(String(packet.reportID));

            if (!(await utils.manager.reports.getReport(reportID))) {
                return res.status(404).json({ error: "Report not found" });
            }

            await utils.manager.reports.resolveReport(reportID);

            res.status(200).json({ success: true });
        },
    );
}
