module.exports = (app, utils) => {
    app.get('/api/v1/projects/frontpage', async (req, res) => {
        const packet = req.query;

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

        const tag = tags[Math.floor(Math.random() * tags.length)];

        const featured = await utils.UserManager.getFeaturedProjects(0, Number(utils.env.PageSize));
        
        const almostFeatured = await utils.UserManager.specializedSearch(
            {$match: { featured: false, votes: { $gte: utils.env.FeatureAmount - 5 }}},
            0,
            Number(utils.env.PageSize)
        );
        
        const liked = await utils.UserManager.specializedSearch(
            { $match: { featured: false, votes: { $gte: 5 } } },
            0,
            Number(utils.env.PageSize)
        );
        const highViews = await utils.UserManager.specializedSearch(
            { $match: { featured: false, views: { $gte: 30 } } },
            0,
            Number(utils.env.PageSize)
        );

        const fitsTags = await utils.UserManager.searchForTag(tag, 0, Number(utils.env.PageSize));
        const latest = await utils.UserManager.getProjects(0, Number(utils.env.PageSize));

        const page = {
            featured: featured,
            voted: almostFeatured,
            liked: liked,
            viewed: highViews,
            tagged: fitsTags,
            latest: latest,
            selectedTag: tag
        };

        console.log(page);

        res.header("Content-Type", "application/json");
        res.status(200);
        res.send(page);
    });
}