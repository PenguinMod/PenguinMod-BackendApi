import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getuserstatewrapper",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const projectID = String(packet.projectId);

            const id = res.locals.login.id;

            if (
                !projectID ||
                !(await utils.UserManager.projectExists(projectID))
            ) {
                return res.status(404).json({ error: "Project not found" });
            }

            // TODO: probably condense this into one db operation
            const hasLoved = await utils.UserManager.hasLovedProject(
                projectID,
                id,
            );
            const hasVoted = await utils.UserManager.hasVotedProject(
                projectID,
                id,
            );

            return res.send({ hasLoved, hasVoted });
        },
    );
}
