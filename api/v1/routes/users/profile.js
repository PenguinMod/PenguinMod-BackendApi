module.exports = (app, utils) => {
    app.get('/api/v1/users/profile', async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();
        const token = packet.token || "";
    
        if (typeof username !== "string") {
            utils.error(res, 400, "NoUserSpecified")
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        if (token) {
            if (!await utils.UserManager.loginWithToken(username, token, true)) {
                return utils.error(res, 401, "Reauthenticate");
            }
        } else {
            if (await utils.UserManager.isBanned(username)) {
                utils.error(res, 404, "NotFound")
                return;
            }
        }

        const badges = await utils.UserManager.getBadges(username);
        const isDonator = badges.includes('donator');

        const rank = await utils.UserManager.getRank(username);

        const signInDate = await utils.UserManager.getFirstLogin(username);

        const userProjects = await utils.UserManager.getProjectsByAuthor(username, 0, Number(utils.env.PageSize));

        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8) // first signed in 5 days ago
            || badges.length > 0; // or we have a badge

        const followers = await utils.UserManager.getFollowerCount(username);

        const myFeaturedProject = await utils.UserManager.getFeaturedProject(username);
        const myFeaturedProjectTitle = await utils.UserManager.getFeaturedProjectTitle(username);

        const bio = await utils.UserManager.getBio(username);

        const user = {
            username,
            badges,
            donator: isDonator,
            rank,
            bio,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers,
            canrankup: canRequestRankUp && rank === 0,
            projects: userProjects.length // we check projects anyways so might aswell
        };
        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(user);
    });
}