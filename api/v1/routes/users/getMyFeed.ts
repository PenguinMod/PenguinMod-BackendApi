import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmyfeed",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const feed = await utils.manager.users.getUserFeed(
                res.locals.login.id,
                Number(process.env.FeedSize),
            );

            res.status(200).json({ feed });
        },
    );
}
