import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/misc/markTOSAsRead",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            await utils.manager.users.markTOSAsRead(res.locals.login.username);

            res.status(200).json({ success: true });
        },
    );
}
