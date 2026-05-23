const UserManager = require("../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    // if less than 0, no wait time, else if it exists then set it to that else 5 minutes
    const cache_time =
        Number(utils.env.FrontPageCacheTime) < 0
            ? 0
            : utils.env.FrontPageCacheTime
              ? Number(utils.env.FrontPageCacheTime)
              : 5 * 60;

    const normal_cache = utils.cachinator(1000 * cache_time);
    const mod_cache = utils.cachinator(1000 * cache_time);

    app.get("/api/v1/projects/frontpage", async (req, res) => {
        const packet = req.query;

        const token = String(packet.token);

        const login = await utils.UserManager.loginWithToken(token);
        const user_and_logged_in = login.success;
        const is_mod = login.isMod;
        const user_id = login.id;

        const page = await (is_mod ? mod_cache : normal_cache).get(async () => {
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

            const tag = "#" + tags[Math.floor(Math.random() * tags.length)];

            const user_id = null; // prevent searching for blocked users
            /* user_and_logged_in
                            ? await utils.UserManager.getIDByUsername(username)
                            : null; */

            const [featured, almostFeatured, fitsTags, latest] =
                await Promise.all([
                    utils.UserManager.getFeaturedProjects(
                        0,
                        Number(utils.env.PageSize),
                    ),
                    utils.UserManager.almostFeatured(
                        0,
                        Number(utils.env.PageSize) || 20,
                        Number(utils.env.MaxPageSize) || 100,
                    ),
                    utils.UserManager.searchProjects(
                        is_mod,
                        tag,
                        "newest",
                        0,
                        Number(utils.env.PageSize),
                        Number(utils.env.MaxPageSize),
                    ),
                    utils.UserManager.getProjects(
                        is_mod,
                        0,
                        Number(utils.env.PageSize) * 2,
                        Number(utils.env.MaxPageSize),
                        user_id,
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

            /*
                    if (user_and_logged_in) {
                        const is_donator = await utils.UserManager.isDonator(username);
                        if (is_donator) {
                            console.log("-------TIMING SUGGESTED-------");
                            console.time("suggested");
                            const fyp = await utils.UserManager.getFYP(username, 0, Number(utils.env.PageSize), Number(utils.env.MaxPageSize));
                            page.suggested = fyp;
                            console.timeEnd("suggested");
                        }
                    }
                    */

            page.selectedTag = tag;

            return page;
        });

        if (user_and_logged_in) {
            page.blocked = await utils.UserManager.getAllBlocked(user_id);
        }

        res.header("Content-Type", "application/json");
        res.header("Cache-Control", "public, max-age=90");
        res.status(200);
        res.send(page);

        const pids = Object.values(page)
            .flat()
            .filter((i) => typeof i != "string")
            .map((i) => i.id);

        utils.UserManager.addImpressionsMany(pids).catch((e) => {
            console.error(`FAILED TO ADD IMPRESSIONS: ${e}`);
        });
    });
};
