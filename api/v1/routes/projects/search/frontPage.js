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
    app.get(
        "/api/v1/projects/frontpage",
        utils.rateLimiter({
            validate: {
                trustProxy: true,
                xForwardedForHeader: true,
            },
            windowMs: 1000 * 10, // 1 requests per 10 seconds
            limit: 1,
            standardHeaders: "draft-7",
            legacyHeaders: false,
        }),
        async (req, res) => {
            const packet = req.query;
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

            const token = packet.token;

            const login = await utils.UserManager.loginWithToken(token);
            const user_and_logged_in = login.success;
            const username = login.username;

            const is_mod =
                user_and_logged_in &&
                (await utils.UserManager.isModeratorOrAdmin(username));

            const tag = "#" + tags[Math.floor(Math.random() * tags.length)];

            /*
            const highViews = await utils.UserManager.specializedSearch(
                [{ $match: { featured: false, views: { $gte: 30 }, softRejected: false, hardReject: false } }],
                0,
                Number(utils.env.PageSize),
                Number(utils.env.MaxPageSize) * 10,
            )
            */

            const user_id = user_and_logged_in
                ? await utils.UserManager.getIDByUsername(username)
                : null;

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
                        Number(utils.env.PageSize),
                        Number(utils.env.MaxPageSize),
                        user_id,
                    ),
                ]);

            const page = {
                featured: featured,
                voted: almostFeatured,
                //viewed: highViews, // disabled since we dont use it (dont waste resources)
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

            res.header("Content-Type", "application/json");
            res.header("Cache-Control", "public, max-age=90");
            res.status(200);
            res.send(page);

            const pids = Object.values(page)
                .flat()
                .filter((i) => typeof i != "string")
                .map((i) => i.id);

            utils.UserManager.addImpressionsMany(pids).catch((e) => {
                console.log("FAILED TO ADD IMPRESSIONS: " + e);
            });
        },
    );
};
