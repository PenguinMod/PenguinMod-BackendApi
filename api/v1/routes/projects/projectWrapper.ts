import type { Application } from "express";
import type { Utils } from "../../../../index";

// TODO: kill this?

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojectwrapper",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            if (
                !(await utils.UserManager.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Viewing is disabled" });
            }

            const packet = req.query;

            const projectId = String(packet.projectId);

            if (!projectId) {
                return res.status(400).json({ error: "Missing projectId" });
            }

            if (!(await utils.UserManager.projectExists(projectId, true))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const metadata =
                await utils.UserManager.getProjectMetadata(projectId);

            const is_author =
                !!res.locals.login &&
                res.locals.login.username === metadata.author.username;

            if (!is_author) {
                if (
                    !metadata.public ||
                    /*metadata.softRejected ||*/ metadata.hardReject
                ) {
                    return res.status(404).json({ error: "Project not found" });
                }
            }

            if (
                !(await utils.UserManager.hasSeenProject(
                    projectId,
                    req.clientIp,
                ))
            ) {
                await utils.UserManager.projectView(projectId, req.clientIp);
            }

            const project = await utils.UserManager.getProjectFile(projectId);

            const assets = await utils.UserManager.getProjectAssets(projectId);

            return res.send({ project, assets });
        },
    );
}
