import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/markmessageasread",
        ...requireAuth(utils.manager.auth, { allow_banned: true }),
        async function (req, res) {
            const packet = req.body;

            const messageID = String(packet.messageID);

            if (!(await utils.UserManager.messageExists(messageID))) {
                return res.status(400).json({ error: "Invalid message ID" });
            }

            // TODO: verify user is recipient of message

            await utils.UserManager.markMessageAsRead(messageID, true);

            res.status(200).json({ success: true });
        },
    );
}
