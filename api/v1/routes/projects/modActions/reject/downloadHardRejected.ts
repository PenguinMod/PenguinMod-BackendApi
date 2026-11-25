import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/downloadHardReject",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const project = String(packet.project);

            if (!project) {
                return res.status(400).json({ error: "Missing project" });
            }

            const isAdmin = res.locals.login.isAdmin;
            const id = res.locals.login.id;

            if (!(await utils.UserManager.projectExists(project, true))) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(project);
            const authorID = projectMeta.author.id;

            if (!isAdmin && id !== authorID) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            if (!(await utils.UserManager.isHardRejected(project))) {
                return res.status(400).json({ error: "NotHardRejected" });
            }

            const projectPB = await utils.UserManager.getProjectFile(project);
            const assets = await utils.UserManager.getProjectAssets(project);

            res.status(200).json({ project: projectPB, assets });
        },
    );
}
