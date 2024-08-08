module.exports = (app, utils) => {
    app.get('/api/v1/users/profile', async function (req, res) {
        const packet = req.query;

        const target = String(packet.target).toLowerCase();

        const username = String(packet.username).toLowerCase();
        const token = packet.token || "";

        let loggedIn = await utils.UserManager.loginWithToken(username, token);

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        let isMod = false;
        if (loggedIn)
            isMod = await utils.UserManager.isAdmin(username) || await utils.UserManager.isModerator(username);

        if (await utils.UserManager.isBanned(target)) {
            if (username !== target) {
                if (isMod) {
                    // continue
                } else {
                    utils.error(res, 404, "NotFound")
                    return;
                }
            }
        }

        const privateProfile = await utils.UserManager.isPrivateProfile(target);
        const canFollowingSeeProfile = await utils.UserManager.canFollowingSeeProfile(target);

        let user = {
            username: await utils.UserManager.getRealUsername(target),
            badges: [],
            donator: false,
            rank: 0,
            bio: "",
            myFeaturedProject: "",
            myFeaturedProjectTitle: "",
            followers: 0,
            canrankup: false,
            projects: 0,
            privateProfile,
            canFollowingSeeProfile,
            isFollowing: false,
            success: false
        };

        if (loggedIn)
            user.isFollowing = await utils.UserManager.isFollowing(username, target);

        const targetID = await utils.UserManager.getIDByUsername(target);

        if (privateProfile) {
            if (!loggedIn) {
                res.status(200);
                res.header("Content-Type", "application/json");
                res.send(user);
                return;
            }

            if (username !== target) {
                const usernameID = await utils.UserManager.getIDByUsername(username);
            
                const isFollowing = await utils.UserManager.isFollowing(usernameID, targetID);

                if (!isFollowing && !canFollowingSeeProfile && !isMod) {
                    res.status(200);
                    res.header("Content-Type", "application/json");
                    res.send(user);
                    return;
                }
            }
        }

        const badges = await utils.UserManager.getBadges(target);
        const isDonator = badges.includes('donator');

        const rank = await utils.UserManager.getRank(target);

        const signInDate = await utils.UserManager.getFirstLogin(target);

        const userProjects = await utils.UserManager.getProjectsByAuthor(target, 0, 3, true, true);

        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8) // first signed in 5 days ago
            || badges.length > 0; // or we have a badge

        const followers = await utils.UserManager.getFollowerCount(target);

        const myFeaturedProject = await utils.UserManager.getFeaturedProject(target);
        const myFeaturedProjectTitle = await utils.UserManager.getFeaturedProjectTitle(target);

        const bio = await utils.UserManager.getBio(target);

        user = {
            id: targetID,
            username: target,
            badges,
            donator: isDonator,
            rank,
            bio,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers,
            canrankup: canRequestRankUp && rank === 0,
            projects: userProjects.length, // we check projects anyways so might aswell,
            privateProfile,
            canFollowingSeeProfile,
            isFollowing: user.isFollowing,
            success: true
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(user);
    });
}