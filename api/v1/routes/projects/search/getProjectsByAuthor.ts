import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { maybeAuth } from "../../../../../utils/auth";
import { handle_page } from "../../../../../utils/misc";
import { ExtProjectData } from "../../../db/types";
import { makeUsername } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/projects/getprojectsbyauthor",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const authorUsername = makeUsername(String(packet.authorUsername));
            const page = handle_page(packet.page);

            const target_data =
                await utils.manager.users.getUserData(authorUsername);
            if (!target_data) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            const username = res.locals.login?.username || null;

            const isMod = res.locals.login?.isMod || false;

            const id = target_data.id;
            const privateProfile = target_data.privateProfile;
            const canFollowingSeeProfile = target_data.allowFollowingView;

            if (privateProfile) {
                if (!res.locals.login) {
                    return res.status(403).json({ error: "PrivateProfile" });
                }

                const user_id = res.locals.login.id;
                const is_following = await utils.manager.users.isFollowing(
                    id,
                    user_id,
                );

                if (
                    username !== authorUsername &&
                    !(is_following && canFollowingSeeProfile) &&
                    !isMod
                ) {
                    return res.status(403).json({ error: "PrivateProfile" });
                }
            }

            const projects = (
                await utils.manager.projects.getProjectsByAuthor(
                    id,
                    page,
                    Number(process.env.PageSize),
                )
            ).map((project) => {
                const new_proj: ExtProjectData = {
                    ...project,
                    author: {
                        username: authorUsername,
                        id,
                    },
                    fromDonator: target_data.badges.includes("donator"),
                };

                return new_proj;
            });

            for (const project of projects) {
                await utils.manager.projects.addImpression(project.id);
            }

            return res.send(projects);
        },
    );
}
