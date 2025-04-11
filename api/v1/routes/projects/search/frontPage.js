module.exports = (app, utils) => {
    app.get('/api/v1/projects/frontpage', utils.rateLimiter({
        validate: {
            trustProxy: true,
            xForwardedForHeader: true,
        },
        windowMs: 1000 * 10,  // 1 requests per 10 seconds
        limit: 1,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
    }),
    async (req, res) => {
        const packet = req.query
        /* needed:
            - featured
            - almost featured
            - liked
            - high views
            - fits tags
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
            "2d"
        ]

        const username = packet.username;
        const token = packet.token;

        const is_mod = username && token && await utils.UserManager.loginWithToken(username, token) && await utils.UserManager.isModeratorOrAdmin(username)

        const tag = "#" + tags[Math.floor(Math.random() * tags.length)];

        const featured = await utils.UserManager.getFeaturedProjects(0, Number(utils.env.PageSize));
        
        const almostFeatured = await utils.UserManager.almostFeatured(0,
            Number(utils.env.PageSize) || 20,
            Number(utils.env.FeatureAmount) || 20,
        );

        const liked = await utils.UserManager.mostLiked(0, Number(utils.env.PageSize) || 20, Number(utils.env.LikedAmount) || 10);
        /*
        const highViews = await utils.UserManager.specializedSearch(
            [{ $match: { featured: false, views: { $gte: 30 }, softRejected: false, hardReject: false } }],
            0,
            Number(utils.env.PageSize),
            Number(utils.env.MaxPageSize) * 10,
        )
        */

        const user_id = username ? await utils.UserManager.getIDByUsername(username) : null;

        const fitsTags = await utils.UserManager.searchProjects(is_mod, tag, "newest", 0, Number(utils.env.PageSize))

        const latest = await utils.UserManager.getProjects(is_mod, 0, Number(utils.env.PageSize), Number(utils.env.MaxPageSize), user_id);

        const page = {
            featured: featured,
            voted: almostFeatured,
            liked: liked,
            //viewed: highViews, // disabled since we dont use it (dont waste resources)
            tagged: fitsTags,
            latest: latest,
        };

        // TODO: swap to use lookup instead of multiple queries
        for (const key in page) {
            const newPage = []
            for (const project of page[key]) {
                const badges = await utils.UserManager.getBadges(project.author.username);

                if (!badges) continue;

                const isDonator = badges.includes("donator");
                project.fromDonator = isDonator;
                newPage.push(project);
            }
            page[key] = newPage;
        }

        page.selectedTag = tag;

        res.header("Content-Type", "application/json");
        res.header("Cache-Control", "public, max-age=90");
        res.status(200);
        res.send(page);
    });
}
