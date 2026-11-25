import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { projectId } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/downloadHardReject",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const project = projectId(String(packet.project));
            const getAssets = String(packet.getAssets) === "true";

            if (!project) {
                return res.status(400).json({ error: "Missing project" });
            }

            const isAdmin = res.locals.login.isAdmin;
            const id = res.locals.login.id;

            const projectMeta =
                await utils.manager.projects.getProjectMetadata(project);
            if (!projectMeta) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const authorID = projectMeta.author.id;

            if (!isAdmin && id !== authorID) {
                return res.status(401).json({ error: "Invalid credentials" });
            }

            if (!projectMeta.hardReject) {
                return res.status(400).json({ error: "NotHardRejected" });
            }

            const projectPB =
                await utils.manager.projects.getProjectFile(project);
            const assets = getAssets
                ? await utils.manager.projects.getProjectAssets(project)
                : null;

            res.status(200).json({ project: projectPB, assets });
        },
    );
}
