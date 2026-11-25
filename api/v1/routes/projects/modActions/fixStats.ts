import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/fixprojectstats",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const projectID = projectId(String(packet.projectID));

            if (
                !(await utils.manager.projects.projectExists(projectID, true))
            ) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            await utils.manager.projects.fixProjectStats(projectID);

            res.status(200).json({ success: true });
        },
    );
}
