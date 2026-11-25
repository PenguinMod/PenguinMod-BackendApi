import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";
import { projectId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getWhoLoved",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const page = handle_page(packet.page);

            const projectID = projectId(String(packet.projectID));

            if (
                !(await utils.manager.projects.projectExists(projectID, true))
            ) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const loves = await utils.manager.projects.getWhoInteracted(
                projectID,
                page,
                Number(process.env.PageSize),
                "love",
            );

            return res.send({ loves });
        },
    );
}
