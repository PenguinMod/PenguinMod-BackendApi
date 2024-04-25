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

        const featured = await utils.projects.getFeaturedProjects(0, utils.env.PageSize - 5);
        const almostFeatured = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { votes: utils.env.FeatureAmount - 5 }
            },
            0,
            utils.env.PageSize - 5
        );
        const liked = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { votes: 5 }
            },
            0,
            utils.env.PageSize - 5
        );
        const highViews = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { views: 30 }
            },
            0,
            utils.env.PageSize - 5
        );
        const fitsTags = await utils.projects.searchForTag(tag, 0, utils.env.PageSize - 5);
        const latest = await utils.projects.getProjects(0, utils.env.PageSize - 5);

        res.header("Content-Type", "application/json");
        res.status(200);
        res.send({
            featured: featured,
            voted: almostFeatured,
            liked: liked,
            viewed: highViews,
            tagged: fitsTags,
            latest: latest,
            selectedTag: tag
        });
    });
}