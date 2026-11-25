import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmessagecount",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const count = await utils.manager.messages.getMessageCount(
                res.locals.login.id,
            );

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ count: count });
        },
    );
}
