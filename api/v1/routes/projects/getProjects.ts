import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { handle_page } from "../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojects",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Viewing is disabled" });
            }

            const packet = req.query;
            const page = handle_page(packet.page);
            const reverse = String(packet.reverse || false) === "true";

            const is_mod = res.locals.login?.isMod || false;

            const projects = await utils.manager.projects.getRecentProjects(
                is_mod,
                page,
                Number(process.env.PageSize),
                null,
                reverse,
            );

            for (const project of projects) {
                await utils.manager.projects.addImpression(project.id);
            }

            res.status(200).json(projects);
        },
    );
}
