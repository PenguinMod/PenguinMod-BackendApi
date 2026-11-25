import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { projectId } from "../../../../db/new-types";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/hardreject",
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

            if (projectData.hardReject) {
                return res.status(400).json({ error: "AlreadyHardRejected" });
            }

            await utils.manager.projects.hardRejectProject(project);

            await utils.manager.projects.removeEvilProjectReferences(project);

            await utils.manager.messages.sendMessage(
                projectData.author.id,
                {
                    type: "reject",
                    message,
                    hardReject: true,
                    title: projectData.title,
                },
                true,
                project,
            );

            sendAdminLog(
                {
                    action: `${username} hard rejected ${projectData.title}`,
                    content: "",
                    fields: {
                        Mod: username,
                        Reason: `\`\`\`\n${message}\n\`\`\``,
                        Title: projectData.title,
                        ID: project,
                        Author: projectData.author.username,
                    },
                },
                pmUserAuthor(username),
                0xe51810,
            );

            await utils.manager.reports.resolveReports("project", project);

            res.status(200).json({ success: true });
        },
    );
}
