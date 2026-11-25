import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { maybeAuth } from "../../../../../utils/auth";
import { ExtProjectData } from "../../../db/types";
import { UserId } from "../../../db/new-types";

type Response = {
    featured: ExtProjectData[];
    voted: ExtProjectData[];
    tagged: ExtProjectData[];
    latest: ExtProjectData[];
    selectedTag: string;
    blocked: UserId[];
};

export default function (app: Application, utils: Utils): void {
    // if less than 0, no wait time, else if it exists then set it to that else 5 minutes
    const cache_time =
        Number(process.env.FrontPageCacheTime) < 0
            ? 0
            : process.env.FrontPageCacheTime
              ? Number(process.env.FrontPageCacheTime)
              : 5 * 60;

    const cachinator = <T>(
        refreshTime: number,
    ): { get: (else_then: () => Promise<T>) => Promise<T> } => {
        let curr: T | null = null;
        let lastRefresh = 0;

        return {
            get: async (else_then: () => Promise<T>): Promise<T> => {
                if (curr === null || lastRefresh + refreshTime < Date.now()) {
                    curr = await else_then();
                    lastRefresh = Date.now();
                }

                return curr;
            },
        };
    };

    const normal_cache = cachinator<Response>(1000 * cache_time);
    const mod_cache = cachinator<Response>(1000 * cache_time);

    app.get(
        "/api/v1/projects/frontpage",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const is_mod = res.locals.login?.isMod || false;
            const user_id = res.locals.login?.id || null;

            const page = await (is_mod ? mod_cache : normal_cache).get(
                async () => {
                    /* gets:
                        - featured
                        - almost featured
                        // - high views
                        - fits tags
                        - suggested
                        - latest
                    */
                    const tags = [
                        "games",
                        "animation",
                        "art",
                        "platformer",
                        "music",
                        "rpg",
                        "story",
                        "minigames",
                        "online",
                        "remake",
                        "physics",
                        "contest",
                        "horror",
                        "tutorial",
                        "3d",
                        "2d",
                    ];

                    const tag =
                        "#" + tags[Math.floor(Math.random() * tags.length)];

                    const [featured, almostFeatured, fitsTags, latest] =
                        await Promise.all([
                            utils.manager.projects.getFeaturedProjects(
                                0,
                                Number(process.env.PageSize),
                            ),
                            utils.manager.projects.almostFeatured(
                                0,
                                Number(process.env.PageSize) || 20,
                            ),
                            // TODO: this should check for blocked users (although not here)
                            utils.manager.projects.searchProjects(
                                is_mod,
                                tag,
                                "newest",
                                0,
                                Number(process.env.PageSize),
                            ),
                            utils.manager.projects.getRecentProjects(
                                is_mod,
                                0,
                                Number(process.env.PageSize) * 2,
                                null,
                                false,
                                false,
                            ),
                        ]);

                    const page = {
                        featured: featured,
                        voted: almostFeatured,
                        tagged: fitsTags,
                        latest: latest,
                        selectedTag: tag,
                        blocked: [],
                    };

                    return page;
                },
            );

            // TODO: if you block a shit ton of users this will have problems. Perhaps we can get list of all authors being shown and union in the db?
            if (user_id) {
                page.blocked = await utils.manager.users.getAllBlocked(user_id);
            }

            res.header("Cache-Control", "public, max-age=90");
            res.status(200).json(page);

            const pids = Object.values(page)
                .flat()
                .filter((i) => typeof i !== "string")
                .map((i) => i.id);

            utils.manager.projects.addImpressionsMany(pids).catch((e) => {
                console.error(`FAILED TO ADD IMPRESSIONS: ${e}`);
            });
        },
    );
}
