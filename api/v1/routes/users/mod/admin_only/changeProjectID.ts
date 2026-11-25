import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/changeprojectid",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            // TODO: this might be broken? related to assets.

            const target = String(packet.target);
            const newId = String(packet.newId);

            const username = res.locals.login.username;

            if (
                !target ||
                !(await utils.manager.projects.projectExists(target, true))
            ) {
                res.status(404).json({ error: "NotFound" });
                return;
            }
            if (await utils.manager.projects.projectExists(newId, true)) {
                res.status(400).json({ error: "IDTaken" });
                return;
            }

            const projectName = (
                await utils.manager.projects.getProjectMetadata(target)
            ).title;

            await utils.UserManager.changeProjectID(target, newId);

            sendAdminLog(
                {
                    action: `Admin has changed project ${target}'s id to now be ${newId}.`,
                    content: `${username} changed a project's id`,
                    fields: {
                        Admin: username,
                        Title: projectName,
                        URL: `${process.env.StudioURL}/#${newId}`,
                    },
                },
                pmUserAuthor(username),
                0xc6be27,
            );

            res.status(200).json({ success: true });
        },
    );
}
