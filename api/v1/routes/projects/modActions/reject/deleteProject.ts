import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/hardDeleteProject",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const projectID = String(packet.projectID);

            const reason = String(packet.reason);

            const username = res.locals.login.username;
            const isAdmin = res.locals.login.isAdmin;

            if (!projectID) {
                return res.status(404).json({ error: "Project not found" });
            }

            // TODO: just fetch meta once
            if (!(await utils.UserManager.projectExists(projectID, true))) {
                return res.status(404).json({ error: "Project not found" });
            }

            const metadata =
                await utils.UserManager.getProjectMetadata(projectID);

            if (!metadata) {
                console.error(`somehow couldn't get metadata for ${projectID}`);
                return res.status(500).json({ error: "InternalError" });
            }

            // only admins and the project owner can delete projects, not mods
            if (metadata.author.username !== username && !isAdmin) {
                return res.status(403).json({
                    error: "You are not authorized to delete this project",
                });
            }

            if (metadata.author.username !== username) {
                utils.logs.sendAdminLog(
                    {
                        action: `${username} **full deleted** ${metadata.title}`,
                        content: "",
                        fields: {
                            Mod: username,
                            Reason: `\`\`\`\n${reason}\n\`\`\``,
                            Title: metadata.title,
                            ID: projectID,
                            Author: metadata.author.username,
                        },
                    },
                    utils.logs.pmUserAuthor(username),
                    0x912323,
                );

                // notify the author that their project has been deleted
                const userid = metadata.author.userid;
                await utils.UserManager.sendMessage(
                    userid,
                    { type: "delete", title: metadata.title, message: reason },
                    false,
                    projectID,
                );
            }

            await utils.UserManager.deleteProject(projectID);

            res.status(200).json({ success: true });
        },
    );
}
