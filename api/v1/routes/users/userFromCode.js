const UserManager = require("../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get(
        "/api/v1/users/userfromcode",
        utils.cors(),
        async function (req, res) {
            const packet = req.query;

            const token = String(packet.token);

            const login = await utils.UserManager.loginWithToken(
                token,
                true,
                true,
            );
            if (!login.success) {
                utils.error(res, 400, "Reauthenticate");
                return;
            }
            const username = login.username;
            const id = login.id;
            const user_meta = login.fullMeta;
            const badges = login.badges;

            const rank = user_meta.rank;

            const projs_to_rankup = 3;

            const [userProjects, loginMethods] = await Promise.all([
                // avoid doing the check if we're already ranked up
                rank > 0
                    ? new Promise((resolve) => resolve(projs_to_rankup))
                    : utils.UserManager.quickProjectCountCheck(
                          id,
                          projs_to_rankup,
                      ),
                utils.UserManager.getOAuthMethods(username),
            ]);

            const isDonator = badges.includes("donator");
            const isBanned = user_meta.permBanned || user_meta > Date.now();

            const signUpDate = user_meta.firstLogin;

            const day = 1000 * 60 * 60 * 24;

            const has_enough_projects = userProjects >= projs_to_rankup;

            const canRequestRankUp =
                (has_enough_projects && // if we have 3 projects and
                    Date.now() - signUpDate >= day * 5) || // first signed in 5 days ago
                badges.length > 0; // or we have a badge

            const myFeaturedProject = user_meta.featuredProject;
            const myFeaturedProjectTitle = user_meta.featuredProjectTitle;

            const isAdmin = user_meta.admin;
            const isModerator = user_meta.moderator;

            const followers = user_meta.followers;

            const lastPolicyRead = {
                privacyPolicy: user_meta.lastPrivacyPolicyRead,
                TOS: user_meta.lastTOSRead,
                guidelines: user_meta.lastGuidelinesRead,
            };

            const privateProfile = user_meta.privateProfile;
            const canFollowingSeeProfile = user_meta.allowFollowingView;

            const standing =
                user_meta.unbanTime > Date.now()
                    ? 2
                    : user_meta.permBanned
                      ? 3
                      : 0;
            // ATODO: 2 is limited, not yet implemented

            const email = user_meta.email;
            const emailIsVerified = user_meta.emailVerified;

            // there doesnt seem to be a particular reason to return the user's birthday at the moment
            const birthdayEntered = user_meta.birthdayEntered;
            const countryEntered = user_meta.countryEntered;

            if (user_meta.password) loginMethods.push("password");

            const messageCount = await utils.UserManager.getMessageCount(id);

            const user = {
                id,
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
                isEmailVerified: emailIsVerified,
                birthdayEntered,
                countryEntered,
                country: user_meta.country,
                messageCount,
            };

            res.status(200);
            res.header("Content-Type", "application/json");
            res.header("Cache-Control", "public, max-age=90");
            res.send(user);
        },
    );
};
