import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/markallmessagesasread",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            await utils.manager.messages.markAllMessagesAsRead(
                res.locals.login.id,
            );

            res.status(200).json({ success: true });
        },
    );
}
