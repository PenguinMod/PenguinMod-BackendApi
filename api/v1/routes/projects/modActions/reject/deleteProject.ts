import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { projectId } from "../../../../db/new-types";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/hardDeleteProject",
        // we don't require admin since users can delete their own projects
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const projectID = projectId(String(packet.projectID));

            const reason = String(packet.reason);
            const notify = String(packet.notify) === "true";

            const username = res.locals.login.username;
            const isAdmin = res.locals.login.isAdmin;

            const metadata =
                await utils.manager.projects.getProjectMetadata(projectID);

            if (!metadata) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (metadata.author.username !== username && !isAdmin) {
                return res.status(403).json({
                    error: "You are not authorized to delete this project",
                });
            }

            if (metadata.author.username !== username) {
                sendAdminLog(
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
                    pmUserAuthor(username),
                    0x912323,
                );

                if (notify) {
                    const userid = metadata.author.id;
                    await utils.manager.messages.sendMessage(
                        userid,
                        {
                            type: "delete",
                            title: metadata.title,
                            message: reason,
                        },
                        false,
                        projectID,
                    );
                }
            }

            await utils.manager.projects.deleteProject(projectID);

            res.status(200).json({ success: true });
        },
    );
}
