import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/interactions/loveToggle",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const love = String(packet.toggle) === "true";
            const projectID = String(packet.projectId);

            const id = res.locals.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return res.status(404).json({ error: "Project not found" });
            }

            if (
                (await utils.UserManager.hasLovedProject(projectID, id)) ===
                love
            ) {
                return res.status(400).json({ error: "DoesNothing" });
            }

            const projectMeta =
                await utils.UserManager.getProjectMetadata(projectID);
            const authorID = projectMeta.author.id;
            const authorUsername = projectMeta.author.username;
            const authorMeta =
                await utils.UserManager.getUserData(authorUsername);

            if (
                projectMeta.loves >= process.env.LoveAmount &&
                !authorMeta.badges.includes("likes")
            ) {
                await utils.UserManager.addBadge(authorUsername, "likes");
                await utils.UserManager.sendMessage(
                    authorID,
                    { type: "newBadge", badge: "likes" },
                    false,
                    projectID,
                );
            }

            const instructions = projectMeta.instructions;
            const notes = projectMeta.notes;

            const concatted = instructions + "\n\n" + notes;

            await utils.UserManager.loveProject(projectID, id, love);

            res.status(200).json({ success: true });
        },
    );
}
