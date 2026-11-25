import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/restore",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const project = String(packet.project);

            if (!project) {
                return res.status(400).json({ error: "Missing project" });
            }

            const username = res.locals.login.username;

            // TODO: fetch meta once
            if (!(await utils.UserManager.projectExists(project))) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            if (!(await utils.UserManager.isSoftRejected(project))) {
                return res.status(400).json({ error: "NotSoftRejected" });
            }

            await utils.UserManager.softReject(project, false);

            const projectData =
                await utils.UserManager.getProjectMetadata(project);
            const author = projectData.author.id;

            await utils.UserManager.sendMessage(
                author,
                { type: "restored" },
                false,
                project,
            );

            utils.logs.sendAdminLog(
                {
                    action: "Project has been restored",
                    content: `${username} restored project ${project}`,
                    fields: {
                        Mod: username,
                        "Project ID": project,
                        URL: `${process.env.StudioURL}/#${project}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0x2de65d,
            );

            res.status(200).json({ success: true });
        },
    );
}
