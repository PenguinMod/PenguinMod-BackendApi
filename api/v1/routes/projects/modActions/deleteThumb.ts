import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/deletethumb",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const projectID = String(packet.projectID);
            const username = res.locals.login.username;

            if (!(await utils.UserManager.projectExists(projectID))) {
                return res.status(404).json({ error: "Project not found" });
            }

            await utils.UserManager.deleteThumb(projectID);

            utils.logs.sendAdminLog(
                {
                    action: `Project's thumbnail has been deleted`,
                    content: `${username} deleted ${projectID}'s thumbnail`,
                    fields: {
                        Mod: username,
                        "Project ID": projectID,
                        URL: `${process.env.StudioURL}/#${projectID}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xc96800,
            );

            res.status(200).json({ success: true });
        },
    );
}
