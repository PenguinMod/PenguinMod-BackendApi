import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/profile",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const loggedIn = !!res.locals.login;
            const isMod = loggedIn && res.locals.login.isMod;
            const username = loggedIn ? res.locals.login.username : null;

            const target_data = await utils.UserManager.getUserData(target);

            if (!target_data) {
                res.status(404).json({ error: "NotFound" });
                return;
            }

            if (
                (target_data.permBanned ||
                    target_data.unbanTime > Date.now()) &&
                username !== target &&
                !isMod
            ) {
                res.status(404).json({ error: "NotFound" });
                return;
            }

            const privateProfile = target_data.privateProfile;
            const canFollowingSeeProfile = target_data.allowFollowingView;

            let user = {
                success: false,
                id: target_data.id,
                username: target,
                real_username: target_data.real_username,
                badges: [],
                donator: false,
                rank: 0,
                bio: "",
                myFeaturedProject: "",
                myFeaturedProjectTitle: "",
                followers: 0,
                canrankup: false,
                privateProfile,
                canFollowingSeeProfile,
                isFollowing: false,
            };

            const targetID = target_data.id;
            if (loggedIn) {
                const usernameID = res.locals.login.id;
                user.isFollowing = await utils.UserManager.isFollowing(
                    targetID,
                    usernameID,
                );
            }

            if (privateProfile) {
                if (!loggedIn) {
                    res.status(200);
                    res.header("Content-Type", "application/json");
                    res.send(user);
                    return;
                }

                if (
                    username !== target &&
                    !(user.isFollowing && canFollowingSeeProfile) &&
                    !isMod
                ) {
                    res.status(200);
                    res.header("Content-Type", "application/json");
                    res.send(user);
                    return;
                }
            }

            const badges = target_data.badges;
            const isDonator = badges.includes("donator");

            const rank = target_data.rank;

            const signInDate = target_data.firstLogin;

            const userProjects = await utils.UserManager.getProjectsByAuthor(
                targetID,
                0,
                3,
                true,
                true,
            );

            const canRequestRankUp =
                (userProjects.length >= 3 && // if we have 3 projects and
                    (Date.now() - signInDate) / 1000 >= 432000) || // first signed in 5 days ago
                badges.length > 0; // or we have a badge

            const followers = target_data.followers;

            const myFeaturedProject = target_data.featuredProject;
            const myFeaturedProjectTitle = target_data.featuredProjectTitle;

            const bio = target_data.bio;

            user = {
                success: true,
                id: targetID,
                username: target,
                real_username: target_data.real_username,
                badges,
                donator: isDonator,
                rank,
                bio,
                myFeaturedProject,
                myFeaturedProjectTitle,
                followers: followers,
                canrankup: canRequestRankUp && rank !== 1,
                privateProfile,
                canFollowingSeeProfile,
                isFollowing: user.isFollowing,
            };

            if (isMod) {
                user.permBanned = target_data.permBanned;
                user.unbanTime = target_data.unbanTime;
                user.banReason = target_data.banReason;
                user.isIPBanned =
                    await utils.UserManager.isUserIPBanned(targetID);
            }

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send(user);
        },
    );
}
