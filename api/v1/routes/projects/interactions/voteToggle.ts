import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/interactions/voteToggle",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const vote = String(packet.toggle) === "true";
            const projectID = String(packet.projectId);

            const id = res.locals.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return res.status(404).json({ error: "Project not found" });
            }

            if (
                (await utils.UserManager.hasVotedProject(projectID, id)) ===
                vote
            ) {
                return res.status(400).json({ error: "DoesNothing" });
            }

            await utils.UserManager.voteProject(projectID, id, vote);

            const metadata =
                await utils.UserManager.getProjectMetadata(projectID);

            const authorMeta = await utils.UserManager.getUserData(
                metadata.author.username,
            );

            const author_username = metadata.author.username;

            if (
                metadata.votes >= process.env.LoveAmount &&
                !authorMeta.badges.includes("votes")
            ) {
                await utils.UserManager.addBadge(author_username, "votes");
                await utils.UserManager.sendMessage(
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
