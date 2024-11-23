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

        const is_mod = username && token && await utils.UserManager.loginWithToken(username, token) && await utils.UserManager.isModeratorOrAdmin(username)

        const tag = "#" + tags[Math.floor(Math.random() * tags.length)];

        const featured = await utils.UserManager.getFeaturedProjects(0, Number(utils.env.PageSize));
        
        const almostFeatured_inter = await utils.UserManager.specializedSearch(is_mod,
            [
                {
                    $match: { 
                        featured: false, 
                        softRejected: false, 
                        public: true, 
                        hardReject: false 
                    }
                },
                {
                    $lookup: {
                        from: "projectStats",
                        localField: "id",
                        foreignField: "projectId",
                        as: "projectStatsData"
                    }
                },
                {
                    $addFields: {
                        votes: {
                            $size: {
                                $filter: {
                                    input: "$projectStatsData",
                                    as: "stat",
                                    cond: { $eq: ["$$stat.type", "vote"] }
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        votes: { $gte: Math.ceil(utils.env.FeatureAmount / 3 * 2) },
                    }
                },
            ],
            0,
            Number(utils.env.PageSize)
        );

        const almostFeatured = []
        for (const project of almostFeatured_inter) {
            // remove projectstatsdata
            delete project.projectStatsData;
            almostFeatured.push(project);
        }

        const liked_inter = await utils.UserManager.specializedSearch(is_mod,
            [
                {
                    $match: { 
                        featured: false, 
                        softRejected: false, 
                        public: true, 
                        hardReject: false 
                    }
                },
                {
                    $lookup: {
                        from: "projectStats",
                        localField: "id",
                        foreignField: "projectId",
                        as: "projectStatsData"
                    }
                },
                {
                    $addFields: {
                        loves: {
                            $size: {
                                $filter: {
                                    input: "$projectStatsData",
                                    as: "stat",
                                    cond: { $eq: ["$$stat.type", "love"] }
                                }
                            }
                        }
                    }
                },
                {
                    $match: {
                        loves: { $gte: 5 }
                    }
                }
            ],
            0,
            Number(utils.env.PageSize)
        )

        const liked = []
        for (const project of liked_inter) {
            // remove projectstatsdata
            delete project.projectStatsData;
            liked.push(project);
        }

        const highViews = await utils.UserManager.specializedSearch(is_mod,
            [{ $match: { featured: false, views: { $gte: 30 }, softRejected: false, hardReject: false } }],
            0,
            Number(utils.env.PageSize)
        )

        const fitsTags = await utils.UserManager.searchProjects(is_mod, tag, "newest", 0, Number(utils.env.PageSize))

        const latest = await utils.UserManager.getProjects(is_mod, 0, Number(utils.env.PageSize))

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
