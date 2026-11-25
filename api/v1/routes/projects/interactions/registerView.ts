import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/interactions/registerView",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const projectID = String(packet.projectID);

            if (!projectID) {
                return res.status(400).json({ error: "Missing projectID" });
            }

            const id = res.locals.login.id;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            res.status(200).json({ success: true });
        },
    );
}
