import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setmyfeaturedproject",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const project = projectId(String(packet.project));
            const title = Number(packet.title);

            const username = res.locals.login.username;

            if (!(await utils.manager.projects.projectExists(project, false))) {
                res.status(400).json({ error: "InvalidProject" });
                return;
            }

            if (title < 0 || title > 500) {
                res.status(400).json({ error: "InvalidTitle" });
            }

            await utils.manager.users.setFeaturedProject(username, project);
            await utils.manager.users.setFeaturedProjectTitle(username, title);

            res.status(200).json({ success: true });
        },
    );
}
