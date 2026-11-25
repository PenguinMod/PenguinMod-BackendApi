import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { messageId } from "../../../../db/new-types";
import { disputeLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/dispute",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const messageID = messageId(String(packet.messageID));
            const dispute = String(packet.dispute);

            const username = res.locals.login.username;
            const userID = res.locals.login.id;

            const message = await utils.manager.messages.getMessage(messageID);

            if (!message) {
                return res.status(404).json({ error: "MessageNotFound" });
            }

            if (!message.disputable) {
                return res.status(400).json({ error: "NotDisputable" });
            }

            if (message.receiver !== userID) {
                return res.status(401).json({ error: "ThatsNotYoursBuddy" });
            }

            await utils.manager.messages.dispute(messageID, dispute);

            disputeLog(
                username,
                messageID,
                message.message,
                dispute,
                message.projectID,
            );

            res.status(200).json({ success: true });
        },
    );
}
