import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { messageId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getmessagethread",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const message = messageId(String(req.query.messageID));

            const thread =
                await utils.manager.messages.getMessageThread(message);

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ thread });
        },
    );
}
