import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { projectId } from "../../../../db/new-types";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/restore",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const project = projectId(String(packet.project));

            if (!project) {
                return res.status(400).json({ error: "Missing project" });
            }

            const username = res.locals.login.username;

            const projectData =
                await utils.manager.projects.getProjectMetadata(project);
            if (!projectData) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (!projectData.softRejected) {
                return res.status(400).json({ error: "NotSoftRejected" });
            }

            await utils.manager.projects.softReject(project, false);

            const author = projectData.author.id;

            await utils.manager.messages.sendMessage(
                author,
                { type: "restored" },
                false,
                project,
            );

            sendAdminLog(
                {
                    action: "Project has been restored",
                    content: `${username} restored project ${project}`,
                    fields: {
                        Mod: username,
                        "Project ID": project,
                        URL: `${process.env.StudioURL}/#${project}`,
                    },
                },
                pmUserAuthor(username),
                0x2de65d,
            );

            res.status(200).json({ success: true });
        },
    );
}
