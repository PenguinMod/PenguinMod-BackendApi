import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/misc/markGuidelinesAsRead",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            await utils.manager.users.markGuidelinesAsRead(res.locals.login.id);

            res.status(200).json({ success: true });
        },
    );
}
