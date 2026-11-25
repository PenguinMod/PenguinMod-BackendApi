import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

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

            if (
                !project ||
                !(await utils.manager.projects.projectExists(project))
            ) {
                res.status(400).json({ error: "InvalidProject" });
                return;
            }

            // TODO: pretty sure this is not the correct range
            if (packet.title < 0 || packet.title > 500) {
                res.status(400).json({ error: "InvalidTitleType" });
            }

            // TODO: verify user exists

            await utils.UserManager.setFeaturedProject(target, project);
            await utils.UserManager.setFeaturedProjectTitle(target, title);

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin or mod has updated user's featured project.",
                0xc1e518,
                {
                    Project: project,
                    Title: title,
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
