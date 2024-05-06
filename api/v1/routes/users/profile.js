module.exports = (app, utils) => {
    app.get('/api/v1/users/userFromCode', async function (req, res) {
        const username = utils.Cast.toString(req.query.username);
    
        if (typeof username !== "string") {
            utils.error(res, 400, "NoUserSpecified")
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        if (await utils.UserManager.isBanned(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        const badges = await utils.UserManager.getBadges(username);
        const isDonator = badges.includes('donator');

        const rank = await utils.UserManager.getRank(username);

        const signInDate = await UserManager.getFirstLogin(username);

        const userProjects = await utils.ProjectManager.getProjectsByAuthor(0, Number(utils.env.PageSize), username);

        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8) // first signed in 5 days ago
            || badges.length > 0; // or we have a badge

        const followers = await UserManager.getFollowers(username);

        const myFeaturedProject = await utils.UserManager.getFeaturedProject(username);
        const myFeaturedProjectTitle = await utils.UserManager.getFeaturedProjectTitle(username);

        const bio = await UserManager.getBio(username);

        return {
            username,
            admin: AdminAccountUsernames.get(username),
            approver: ApproverUsernames.get(username),
            badges,
            donator: isDonator,
            rank,
            bio,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers.length,
            canrankup: canRequestRankUp && rank === 0,
            viewable: userProjects.length > 0,
            projects: userProjects.length // we check projects anyways so might aswell
        };
    });
}