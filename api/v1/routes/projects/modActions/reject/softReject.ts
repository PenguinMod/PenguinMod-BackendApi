import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { projectId } from "../../../../db/new-types";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/softreject",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const project = projectId(String(packet.project));
            const message = String(packet.message);

            const username = res.locals.login.username;

            const projectData =
                await utils.manager.projects.getProjectMetadata(project);
            if (!projectData) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (projectData.softRejected) {
                return res.status(400).json({ error: "AlreadySoftRejected" });
            }

            await utils.manager.projects.softReject(project, true);

            await utils.manager.messages.sendMessage(
                projectData.author.id,
                { type: "reject", message, hardReject: false },
                true,
                project,
            );

            sendAdminLog(
                {
                    action: `${username} soft rejected ${projectData.title}`,
                    content: "",
                    fields: {
                        Mod: username,
                        Title: projectData.title,
                        Message: `\`\`\`\n${message}\n\`\`\``,
                        Author: projectData.author.username,
                        URL: `${process.env.StudioURL}/#${project}`,
                    },
                },
                pmUserAuthor(username),
                0xffae33,
            );

            await utils.manager.reports.resolveReports("project", project);

            res.status(200).json({ success: true });
        },
    );
}
