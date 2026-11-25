import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";
import { sendAdminUserLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setmyfeaturedprojectadmin",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const project = projectId(String(packet.project));
            const title = Number(packet.title);

            const username = res.locals.login.username;

            if (!(await utils.manager.projects.projectExists(project, true))) {
                res.status(400).json({ error: "InvalidProject" });
                return;
            }

            // TODO: pretty sure this is not the correct range
            if (title < 0 || title > 500) {
                res.status(400).json({ error: "InvalidTitleType" });
            }

            // TODO: verify user exists

            await utils.manager.users.setFeaturedProject(target, project);
            await utils.manager.users.setFeaturedProjectTitle(target, title);

            sendAdminUserLog(
                username,
                target,
                "Admin or mod has updated user's featured project.",
                0xc1e518,
                {
                    Project: project,
                    Title: String(title),
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
