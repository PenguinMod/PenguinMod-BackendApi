import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/requestrankup",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const badges = res.locals.login.badges;

            const rank = res.locals.login.rank;
            if (rank !== 0) {
                res.status(400).json({ error: "AlreadyRankedHighest" });
                return;
            }

            const user_id = res.locals.login.id;

            const signInDate = res.locals.login.fullMeta.firstLogin;
            // TODO: probably not the best way to do this
            const userProjects = await utils.UserManager.getProjectsByAuthor(
                user_id,
                0,
                3,
                true,
                true,
            );

            const canRequestRankUp =
                (userProjects.length >= 3 && // if we have 3 projects and
                    Date.now() - signInDate >= 4.32e8) || // first signed in 5 days ago
                badges.length > 0; // or we have a badge

            if (!canRequestRankUp) {
                res.status(403).json({ error: "Ineligble" });
                return;
            }

            const PENGUIN_RANK = 1;
            await utils.UserManager.setRank(
                res.locals.login.username,
                PENGUIN_RANK,
            );

            res.status(200).json({ success: true });
        },
    );
}
