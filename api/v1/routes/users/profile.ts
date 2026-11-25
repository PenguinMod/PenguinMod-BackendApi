import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";
import { ProjectId, projectId, UserId } from "../../db/new-types";

type UserData = {
    success: boolean;
    id: UserId;
    username: string;
    real_username: string;
    badges: string[];
    donator: boolean;
    rank: number;
    bio: string;
    myFeaturedProject: ProjectId;
    myFeaturedProjectTitle: number;
    followers: number;
    canrankup: boolean;
    privateProfile: boolean;
    canFollowingSeeProfile: boolean;
    isFollowing: boolean;
    permBanned?: boolean;
    unbanTime?: number;
    banReason?: string;
    isIPBanned?: boolean;
};

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/profile",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const isMod = res.locals.login?.isMod || false;
            const username = res.locals.login?.username || null;

            const target_data = await utils.manager.users.getUserData(target);

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

            let user: UserData = {
                success: false,
                id: target_data.id,
                username: target,
                real_username: target_data.real_username,
                badges: [],
                donator: false,
                rank: 0,
                bio: "",
                myFeaturedProject: projectId(""),
                myFeaturedProjectTitle: 0,
                followers: 0,
                canrankup: false,
                privateProfile,
                canFollowingSeeProfile,
                isFollowing: false,
            };

            const targetID = target_data.id;
            if (res.locals.login) {
                const usernameID = res.locals.login.id;
                user.isFollowing = await utils.manager.users.isFollowing(
                    targetID,
                    usernameID,
                );
            }

            if (privateProfile) {
                if (!res.locals.login) {
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

            const userProjects =
                await utils.manager.projects.getProjectsByAuthor(
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
                    await utils.manager.users.isUserIPBanned(targetID);
            }

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send(user);
        },
    );
}
