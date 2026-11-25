import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/setCanBeFeatured",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const projectID = String(packet.projectID);
            const canBeFeatured = String(packet.toggle) === "true";
            const username = res.locals.login.username;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return res.status(404).json({ error: "Project not found" });
            }

            await utils.UserManager.setCanBeFeatured(projectID, canBeFeatured);

            utils.logs.sendAdminLog(
                {
                    action: `Project ${canBeFeatured ? "can" : "cannot"} be featured now`,
                    content: `${username} changed featurability of ${projectID}`,
                    fields: {
                        Admin: username,
                        "Project ID": projectID,
                        URL: `${process.env.StudioURL}/#${projectID}`,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xc8e847,
            );

            res.status(200).json({ success: true });
        },
    );
}
