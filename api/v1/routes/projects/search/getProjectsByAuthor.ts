import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojectsbyauthor",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const authorUsername = String(packet.authorUsername).toLowerCase();
            const page = utils.handle_page(packet.page);

            if (
                !authorUsername ||
                !(await utils.UserManager.existsByUsername(authorUsername))
            ) {
                return res.status(404).json({ error: "User not found" });
            }

            const logged_in = !!res.locals.login;
            const username = logged_in ? res.locals.login.username : null;

            const target_data =
                await utils.UserManager.getUserData(authorUsername);
            let isMod = false;
            if (logged_in) {
                const user_data = await utils.UserManager.getUserData(username);
                isMod = user_data.moderator || user_data.admin;
            }

            const id = target_data.id;
            const privateProfile = target_data.privateProfile;
            const canFollowingSeeProfile = target_data.allowFollowingView;

            if (privateProfile) {
                if (!logged_in) {
                    return await res
                        .status(403)
                        .json({ error: "PrivateProfile" });
                }

                const user_id = res.locals.login.id;
                const is_following = await utils.UserManager.isFollowing(
                    id,
                    user_id,
                );

                if (
                    username !== authorUsername &&
                    !(is_following && canFollowingSeeProfile) &&
                    !isMod
                ) {
                    return await res
                        .status(403)
                        .json({ error: "PrivateProfile" });
                }
            }

            const projects = (
                await utils.UserManager.getProjectsByAuthor(
                    id,
                    page,
                    Number(process.env.PageSize),
                )
            ).map((project) => {
                project.author = {
                    username: authorUsername,
                    id: id,
                };

                return project;
            });

            for (const project of projects) {
                await utils.UserManager.addImpression(project.id);
            }

            return res.send(projects);
        },
    );
}
