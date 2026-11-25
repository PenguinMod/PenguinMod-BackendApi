import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/deletemodmessage",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const messageID = String(packet.messageID);

            const username = res.locals.login.username;

            utils.logs.sendAdminLog({
                action: `Mod message has been deleted`,
                content: `${username} deleted mod message ${messageID}`,
                fields: {
                    Mod: username,
                    "Message Content": (
                        await utils.UserManager.getMessage(messageID)
                    ).message,
                },
            });

            await utils.UserManager.deleteMessage(messageID);

            res.status(200).json({ success: true });
        },
    );
}
