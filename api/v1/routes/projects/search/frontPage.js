const softReject = require("../modActions/reject/softReject");

module.exports = (app, utils) => {
    app.get('/api/v1/projects/frontpage', async (req, res) => {
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

        const is_mod = username && token && utils.UserManager.loginWithToken(username, token) && utils.UserManager.isModeratorOrAdmin(username)

        const tag = "#" + tags[Math.floor(Math.random() * tags.length)];

        const featured = await utils.UserManager.getFeaturedProjects(0, Number(utils.env.PageSize));
        
        const almostFeatured = await utils.UserManager.specializedSearch(is_mod,
            {$match: { featured: false, votes: { $gte: utils.env.FeatureAmount - 10 }, softRejected: false, public: true, hardReject: false }},
            0,
            Number(utils.env.PageSize)
        )
        
        const liked = await utils.UserManager.specializedSearch(is_mod,
            { $match: { featured: false, loves: { $gte: 5 }, softRejected: false, public: true, hardReject: false } },
            0,
            Number(utils.env.PageSize)
        )

        const highViews = await utils.UserManager.specializedSearch(is_mod,
            { $match: { featured: false, views: { $gte: 30 }, softRejected: false, hardReject: false } },
            0,
            Number(utils.env.PageSize)
        )

        const fitsTags = await utils.UserManager.searchForTag(is_mod, tag, 0, Number(utils.env.PageSize))
        
        const latest = await utils.UserManager.getProjects(is_mod, 0, Number(utils.env.PageSize))

        console.log(fitsTags);

        const page = {
            featured: featured,
            voted: almostFeatured,
            liked: liked,
            viewed: highViews,
            tagged: fitsTags,
            latest: latest,
        };

        // TODO: swap to use lookup instead of multiple queries
        for (const key in page) {
            const newPage = []
            for (const project of page[key]) {
                const isDonator = (await utils.UserManager.getBadges(project.author.username)).includes("donator");
                project.fromDonator = isDonator;
                newPage.push(project);
            }
            page[key] = newPage;
        }

        page.selectedTag = tag;

        res.header("Content-Type", "application/json");
        res.status(200);
        res.send(page);
    });
}
