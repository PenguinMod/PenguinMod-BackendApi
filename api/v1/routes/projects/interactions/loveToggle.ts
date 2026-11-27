import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";
import { assertNonNull } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/interactions/loveToggle",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const love = String(packet.toggle) === "true";
            const projectID = projectId(String(packet.projectId));

            const id = res.locals.login.id;

            if (
                (await utils.manager.projects.hasLovedProject(
                    projectID,
                    id,
                )) === love
            ) {
                return res.status(400).json({ error: "DoesNothing" });
            }

            const projectMeta =
                await utils.manager.projects.getProjectMetadata(projectID);

            if (!projectMeta || !projectMeta.public || projectMeta.hardReject) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const authorID = projectMeta.author.id;
            const authorMeta = assertNonNull(
                await utils.manager.users.getUserDataByID(authorID),
            );

            if (
                Number(projectMeta.loves) >= Number(process.env.LoveAmount) &&
                !authorMeta.badges.includes("likes")
            ) {
                await utils.manager.users.addBadge(authorID, "likes");
                await utils.manager.messages.sendMessage(
                    authorID,
                    { type: "newBadge", badge: "likes" },
                    false,
                    projectID,
                );
            }

            await utils.manager.projects.loveProject(projectID, id, love);

            res.status(200).json({ success: true });
        },
    );
}
