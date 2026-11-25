import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/hasLovedAdmin",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const projectID = projectId(String(packet.projectID));

            if (
                !(await utils.manager.projects.projectExists(projectID, true))
            ) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            const data = await utils.manager.users.getUserData(target);
            if (!data) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            const has = await utils.manager.projects.hasLovedProject(
                projectID,
                data.id,
            );

            return res.send({ hasLoved: has });
        },
    );
}
