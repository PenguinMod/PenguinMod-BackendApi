import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getWhoLoved",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const page = utils.handle_page(packet.page);

            const projectID = String(packet.projectID);

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID, true))
            ) {
                return res.status(404).json({ error: "Project not found" });
            }

            const loves = await utils.UserManager.getWhoInteracted(
                projectID,
                page,
                Number(process.env.PageSize),
                "love",
            );

            return res.send({ loves });
        },
    );
}
