import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { messageId } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/markmessageasread",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const packet = req.body;

            const messageID = messageId(String(packet.messageID));

            // TODO: verify user is recipient of message

            if (
                !(await utils.manager.messages.markMessageAsRead(
                    messageID,
                    res.locals.login.id,
                    true,
                ))
            ) {
                return res.status(400).json({ error: "Invalid message ID" });
            }

            res.status(200).json({ success: true });
        },
    );
}
