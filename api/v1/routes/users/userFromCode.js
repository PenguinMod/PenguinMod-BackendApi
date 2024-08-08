module.exports = (app, utils) => {
    app.get('/api/v1/users/userfromcode', async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;
    
        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            return utils.error(res, 401, "Reauthenticate");
        }

        const user_meta = await utils.UserManager.getUserData(username);

        const id = user_meta.id;
        const badges = user_meta.badges;
        const isDonator = badges.includes('donator');
        const isBanned = user_meta.permBanned || user_meta > Date.now();
        const rank = user_meta.rank;
        const signUpDate = user_meta.firstLogin;

        // its fine to do this since its just metadata
        const userProjects = await utils.UserManager.getProjectsByAuthor(id, 0, 3);
        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signUpDate) >= 4.32e+8) // first signed in 5 days ago
            || badges.length > 0; // or we have a badge

        const myFeaturedProject = user_meta.featuredProject
        const myFeaturedProjectTitle = user_meta.featuredProjectTitle;

        const isAdmin = user_meta.admin;
        const isModerator = user_meta.moderator;

        const loginMethods = await utils.UserManager.getOAuthMethods(username);

        const followers = user_meta.followers;

        const lastPolicyRead = {
            privacyPolicy: user_meta.lastPrivacyPolicyRead,
            TOS: user_meta.lastTOSRead,
            guidelines: user_meta.lastGuidelinesRead
        };

        const privateProfile = user_meta.privateProfile;
        const canFollowingSeeProfile = user_meta.allowFollowingView;

        const standing =user_meta.unbanTime > Date.now() ? 2 :
                        user_meta.permBanned ? 3 : 0;
        // ATODO: 2 is limited, not yet implemented

        const email = user_meta.email;

        const emailIsVerified = user_meta.emailVerified;

        if (user_meta.password) loginMethods.push("password");

        const user = {
            username,
            real_username: user_meta.real_username,
            admin: isAdmin,
            approver: isModerator,
            isBanned: isBanned,
            badges,
            donator: isDonator,
            rank,
            myFeaturedProject,
            myFeaturedProjectTitle,
            followers: followers,
            canrankup: canRequestRankUp && rank === 0,
            viewable: userProjects.length > 0,
            loginMethods: loginMethods,
            lastPolicyRead: lastPolicyRead,
            privateProfile,
            canFollowingSeeProfile,
            standing,
            email,
            isEmailVerified: emailIsVerified
        };

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send(user);
    });
}
