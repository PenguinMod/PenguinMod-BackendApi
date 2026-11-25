import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmessagethread",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const message = String(req.query.messageID);

            const thread = await utils.UserManager.getMessageThread(message);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ thread });
        },
    );
}
