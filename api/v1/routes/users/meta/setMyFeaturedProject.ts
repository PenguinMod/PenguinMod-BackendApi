import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setmyfeaturedproject",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const project = String(packet.project);
            const title = Number(packet.title);

            const username = res.locals.login.username;

            if (!project || !(await utils.UserManager.projectExists(project))) {
                res.status(400).json({ error: "InvalidProject" });
                return;
            }

            if (packet.title < 0 || packet.title > 500) {
                res.status(400).json({ error: "InvalidTitle" });
            }

            await utils.UserManager.setFeaturedProject(username, project);
            await utils.UserManager.setFeaturedProjectTitle(username, title);

            res.status(200).json({ success: true });
        },
    );
}
