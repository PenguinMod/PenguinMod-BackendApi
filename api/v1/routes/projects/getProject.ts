import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { projectId } from "../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getproject",
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

            const requestType = String(packet.requestType);
            const projectID = projectId(String(packet.projectID));

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);
            if (!metadata) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const is_author =
                res.locals.login &&
                metadata.author.username === res.locals.login.username;
            const is_mod = res.locals.login && res.locals.login.isMod;

            if (
                ((!is_author && !metadata.public) || metadata.hardReject) &&
                !is_mod
            ) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            switch (requestType) {
                case "protobuf": {
                    // views get checked here because projects have to be gotten from here
                    // or projectwrapper but we don't use that rn
                    if (req.clientIp) {
                        await utils.manager.projects.projectView(
                            projectID,
                            req.clientIp,
                        );
                    }

                    const project =
                        await utils.manager.projects.getProjectFile(projectID);

                    if (!project) {
                        return res
                            .status(500)
                            .json({ error: "CouldntGetProjectFile" });
                    }

                    return res
                        .status(200)
                        .type("application/octet-stream")
                        .send(project);
                }
                case "assets": {
                    const assets =
                        await utils.manager.projects.getProjectAssets(
                            projectID,
                        );

                    res.header("Cache-Control", "public, max-age=90");
                    return res.send(assets);
                }
                case "thumbnail": {
                    const thumbnail =
                        await utils.manager.projects.getProjectImage(projectID);

                    if (!thumbnail) {
                        return res
                            .status(404)
                            .json({ error: "Thumbnail not found" });
                    }

                    res.status(200);
                    res.header("Content-Type", "image/webp");
                    res.header("Cache-Control", "public, max-age=90");
                    return res.send(thumbnail);
                }
                case "metadata":
                    return res.send(metadata);
                default:
                    return res
                        .status(400)
                        .json({ error: "Invalid requestType" });
            }
        },
    );
}
