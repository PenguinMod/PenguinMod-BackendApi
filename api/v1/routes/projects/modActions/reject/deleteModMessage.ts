import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";
import { messageId } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/deletemodmessage",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const messageID = messageId(String(packet.messageID));

            const username = res.locals.login.username;

            sendAdminLog(
                {
                    action: `Mod message has been deleted`,
                    content: `${username} deleted mod message ${messageID}`,
                    fields: {
                        Mod: username,
                        "Message Content": JSON.stringify(
                            (await utils.manager.messages.getMessage(messageID))
                                ?.message,
                        ),
                    },
                },
                pmUserAuthor(username),
            );

            await utils.manager.messages.deleteMessage(messageID);

            res.status(200).json({ success: true });
        },
    );
}
