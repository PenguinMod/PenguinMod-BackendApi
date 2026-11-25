import type { Application } from "express";
import type { Utils } from "../../../../../index";
import rateLimit from "express-rate-limit";
import { maybeAuth } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";
import { OldSearchType } from "../../../db/types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/searchprojects",
        rateLimit({
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
            const page = handle_page(packet.page);
            const type = String(packet.type || "newest");
            const reverse = String(packet.reverse) === "true";

            const valid_types = [
                "featured",
                "newest",
                "uploaddate",
                "views",
                "loves",
                "votes",
            ] as const;

            function isType(value: string): value is OldSearchType {
                return valid_types.includes(value as OldSearchType);
            }

            if (!isType(type)) {
                return res.status(400).json({ error: "InvalidType" });
            }

            const is_mod = res.locals.login?.isMod || false;

            const projects = await utils.manager.projects.searchProjects(
                is_mod,
                query,
                type,
                page,
                Number(process.env.PageSize),
                reverse,
            );

            for (const project of projects) {
                await utils.manager.projects.addImpression(project.id);
            }

            res.status(200).json(projects);
        },
    );
}
