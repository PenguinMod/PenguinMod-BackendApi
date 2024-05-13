module.exports = (app, utils) => {
    app.get('/api/v1/users/userfromcode', async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;
    
        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        const badges = await utils.UserManager.getBadges(username);
        const isDonator = badges.includes('donator');

        const isBanned = await utils.UserManager.isBanned(username);

        const rank = await utils.UserManager.getRank(username);

        const signInDate = await utils.UserManager.getFirstLogin(username);

        const userProjects = await utils.UserManager.getProjectsByAuthor(id, 0, 3);

        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8) // first signed in 5 days ago
            || badges.length > 0; // or we have a badge

        const followers = await utils.UserManager.getFollowers(username);

        const myFeaturedProject = await utils.UserManager.getFeaturedProject(username);
        const myFeaturedProjectTitle = await utils.UserManager.getFeaturedProjectTitle(username);

        const isAdmin = await utils.UserManager.isAdmin(username);
        const isModerator = await utils.UserManager.isModerator(username);

        const user = {
            username,
            admin: isAdmin,
            approver: isModerator,
            isBanned: isBanned,
            badges,
            donator: isDonator,
            rank,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers.length,
            canrankup: canRequestRankUp && rank === 0,
            viewable: userProjects.length > 0,
            projects: userProjects.length // we check projects anyways so might aswell
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(user);
    });
}
