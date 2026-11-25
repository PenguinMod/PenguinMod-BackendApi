import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { projectId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getuserstatewrapper",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const projectID = projectId(String(packet.projectId));

            const id = res.locals.login.id;

            if (
                !(await utils.manager.projects.projectExists(projectID, false))
            ) {
                return res.status(404).json({ error: "ProjectNotFound" });
            }

            // TODO: probably condense this into one db operation
            const hasLoved = await utils.manager.projects.hasLovedProject(
                projectID,
                id,
            );
            const hasVoted = await utils.manager.projects.hasVotedProject(
                projectID,
                id,
            );

            return res.send({ hasLoved, hasVoted });
        },
    );
}
