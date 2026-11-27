import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { maybeAuth } from "../../../../../utils/auth";
import { makeUsername, projectId } from "../../../db/new-types";
import { SearchInclude, Sort } from "../../../db/types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/search-new",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const tristate = (str: string): boolean | undefined =>
                str === "true" ? true : str === "false" ? false : undefined;

            const parseDate = (value: string): Date | undefined => {
                const date = new Date(
                    /^\d+$/.test(value) ? Number(value) : value,
                );

                if (Number.isNaN(date.getTime())) {
                    return undefined;
                }

                return date;
            };

            const query = String(packet.q || "");
            const sort = String(packet.sort);

            const valid_sorts = [
                "newest-update",
                "newest-upload",
                "views",
                "votes",
                "loves",
            ] as const;

            function isSort(value: string): value is Sort {
                return valid_sorts.includes(value as Sort);
            }

            if (!isSort(sort)) {
                return res.status(400).json({ error: "InvalidSort" });
            }

            const reverse = String(packet.reverse) === "true";
            const before = parseDate(String(packet.before));
            const after = parseDate(String(packet.after));
            const remix_target = packet.remix
                ? projectId(String(packet.remix))
                : undefined;
            const featured = tristate(String(packet.featured));

            const author = packet.author
                ? (
                      await utils.manager.users.getUserData(
                          makeUsername(String(packet.author)),
                      )
                  )?.id
                : undefined;

            const include_raw = String(packet.include);
            const page = Number(packet.page) || 0;

            const max_page_size = Number(process.env.PageSize);
            const limit = Number(packet.pageSize) || max_page_size;
            const page_size = Math.min(max_page_size, limit);

            if (page < 0 || page_size < 0) {
                return res.status(400).json({ error: "InvalidPageOrPageSize" });
            }

            const include_total = String(packet.includeTotal) === "true";

            const is_mod = !!res.locals.login && res.locals.login.isMod;

            let include: SearchInclude = is_mod ? "all" : "ranked";
            if (is_mod) {
                const valid_includes = [
                    "all",
                    "all-allowed",
                    "ranked",
                    "unranked",
                    "rejected",
                ] as const;

                function isInclude(value: string): value is SearchInclude {
                    return valid_includes.includes(value as SearchInclude);
                }

                if (isInclude(include_raw)) {
                    include = include_raw;
                }
            }

            const { projects, total } =
                await utils.manager.projects.searchProjectsNew(
                    query,
                    sort,
                    reverse,
                    before,
                    after,
                    remix_target,
                    featured,
                    author,
                    include,
                    page,
                    page_size,
                    include_total,
                );

            for (const project of projects) {
                await utils.manager.projects.addImpression(project.id);
            }

            res.header("Cache-Control", "public, max-age=90");
            res.status(200).json({ projects, total });
        },
    );
}
