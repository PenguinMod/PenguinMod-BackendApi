import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { projectId } from "../../db/new-types";

// TODO: kill this?

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojectwrapper",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Viewing is disabled" });
            }

            const packet = req.query;

            const projectID = projectId(String(packet.projectId));

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);

            if (!metadata) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const is_author =
                !!res.locals.login &&
                res.locals.login.username === metadata.author.username;

            if (!is_author) {
                if (
                    !metadata.public ||
                    /*metadata.softRejected ||*/ metadata.hardReject
                ) {
                    return res.status(404).json({ error: "ProjectNotFound" });
                }
            }

            if (req.clientIp) {
                await utils.manager.projects.projectView(
                    projectID,
                    req.clientIp,
                );
            }

            const project =
                await utils.manager.projects.getProjectFile(projectID);

            const assets =
                await utils.manager.projects.getProjectAssets(projectID);

            return res.send({ project, assets });
        },
    );
}
