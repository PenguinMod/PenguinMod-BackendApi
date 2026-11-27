import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";
import { assertNonNull } from "../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/interactions/voteToggle",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const vote = String(packet.toggle) === "true";
            const projectID = projectId(String(packet.projectId));

            const id = res.locals.login.id;

            if (
                (await utils.manager.projects.hasVotedProject(
                    projectID,
                    id,
                )) === vote
            ) {
                return res.status(400).json({ error: "DoesNothing" });
            }

            await utils.manager.projects.voteProject(projectID, id, vote);

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);
            if (!metadata) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const authorMeta = assertNonNull(
                await utils.manager.users.getUserData(metadata.author.username),
            );

            if (
                metadata.votes >= Number(process.env.LoveAmount) &&
                !authorMeta.badges.includes("votes")
            ) {
                await utils.manager.users.addBadge(metadata.author.id, "votes");
                await utils.manager.messages.sendMessage(
                    metadata.author.id,
                    { type: "newBadge", badge: "votes" },
                    false,
                    projectID,
                );
            }

            res.status(200).json({ success: true });
        },
    );
}
