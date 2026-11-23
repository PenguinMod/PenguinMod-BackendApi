/**
 * @typedef {Object} Utils
 * @property {import("../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    // if less than 0, no wait time, else if it exists then set it to that else 5 minutes
    const cache_time =
        Number(process.env.FrontPageCacheTime) < 0
            ? 0
            : process.env.FrontPageCacheTime
              ? Number(process.env.FrontPageCacheTime)
              : 5 * 60;

    const cachinator = (refreshTime) => ({
        curr: null,
        lastRefresh: 0,
        get: async (else_then) => {
            if (!this.curr || this.lastRefresh + refreshTime < Date.now()) {
                this.curr = await else_then();
                this.lastRefresh = Date.now();
            }

            return this.curr;
        },
    });

    const normal_cache = cachinator(1000 * cache_time);
    const mod_cache = cachinator(1000 * cache_time);

    app.get(
        "/api/v1/projects/frontpage",
        utils.maybeAuth(utils.UserManager),
        async (req, res) => {
            const logged_in = !!req.login;
            const is_mod = logged_in && req.login.isMod;
            const user_id = logged_in ? req.login.id : null;

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
                            utils.UserManager.getFeaturedProjects(
                                0,
                                Number(process.env.PageSize),
                            ),
                            utils.UserManager.almostFeatured(
                                0,
                                Number(process.env.PageSize) || 20,
                                Number(process.env.MaxPageSize) || 100,
                            ),
                            // TODO: this should check for blocked users (although not here)
                            utils.UserManager.searchProjects(
                                is_mod,
                                tag,
                                "newest",
                                0,
                                Number(process.env.PageSize),
                                Number(process.env.MaxPageSize),
                            ),
                            utils.UserManager.getProjects(
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
                    };

                    page.selectedTag = tag;

                    return page;
                },
            );

            // TODO: if you block a shit ton of users this will have problems. Perhaps we can get list of all authors being shown and union in the db?
            if (logged_in) {
                page.blocked = await utils.UserManager.getAllBlocked(user_id);
            }

            res.header("Cache-Control", "public, max-age=90");
            res.status(200).json(page);

            const pids = Object.values(page)
                .flat()
                .filter((i) => typeof i !== "string")
                .map((i) => i.id);

            utils.UserManager.addImpressionsMany(pids).catch((e) => {
                console.error(`FAILED TO ADD IMPRESSIONS: ${e}`);
            });
        },
    );
};
