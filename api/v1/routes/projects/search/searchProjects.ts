import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/searchprojects",
        utils.rateLimiter({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 10000, // 7 requests per 10 seconds
            limit: 7,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const query = String(packet.query || "");
            const page = utils.handle_page(packet.page);
            const type = String(packet.type || "");
            let reverse = String(packet.reverse) === "true";

            if (reverse === "false") {
                reverse = false;
            }
            if (reverse === "true") {
                reverse = true;
            }

            const is_mod = !!res.locals.login && res.locals.login.isMod;

            const projects = await utils.UserManager.searchProjects(
                is_mod,
                query,
                type,
                page,
                Number(process.env.PageSize),
                Number(process.env.MaxPageSize),
                reverse,
            );

            for (const project of projects) {
                await utils.UserManager.addImpression(project.id);
            }

            res.status(200).json(projects);
        },
    );
}
