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

        const featured = await utils.projects.getFeaturedProjects(0, Number(utils.env.PageSize));
        const almostFeatured = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { votes: utils.env.FeatureAmount - 5 }
            },
            0,
            Number(utils.env.PageSize)
        );
        const liked = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { votes: 5 }
            },
            0,
            Number(utils.env.PageSize)
        );
        const highViews = await utils.projects.specializedSearch(
            { $match: { featured: false, },
              $gte: { views: 30 }
            },
            0,
            Number(utils.env.PageSize)
        );
        const fitsTags = await utils.projects.searchForTag(tag, 0, Number(utils.env.PageSize));
        const latest = await utils.projects.getProjects(0, Number(utils.env.PageSize));

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