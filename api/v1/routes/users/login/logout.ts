import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/logout",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            await utils.manager.auth.logout(res.locals.login.username);

            res.status(200).json({ success: true });
        },
    );
}
