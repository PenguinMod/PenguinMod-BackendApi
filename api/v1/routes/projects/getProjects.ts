import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { z } from "zod";
import { validate } from "../../../../utils/validate";

const schema = {
    query: z.object({
        page: z.coerce
            .number()
            .int()
            .min(0)
            .catch(0)
            .meta({ description: "Zero-based page number", example: 0 }),
        reverse: z
            .stringbool({ truthy: ["true"], falsy: ["false"] })
            .default(false)
            .meta({ description: "Return oldest projects first" }),
    }),
};

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojects",
        maybeAuth(utils.manager.auth),
        validate(schema),
        async function (req, res) {
            if (
                !(await utils.manager.misc.getRuntimeConfigItem(
                    "viewingEnabled",
                ))
            ) {
                return res.status(503).json({ error: "Viewing is disabled" });
            }

            const { page, reverse } = res.locals.valid.query;

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
