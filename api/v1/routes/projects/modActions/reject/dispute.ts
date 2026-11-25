import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/dispute",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const messageID = String(packet.messageID);
            const dispute = String(packet.dispute);

            const username = res.locals.login.username;
            const userID = res.locals.login.id;

            const message = await utils.UserManager.getMessage(messageID);

            if (!message) {
                return res.status(404).json({ error: "MessageNotFound" });
            }

            if (!message.disputable) {
                return res.status(400).json({ error: "NotDisputable" });
            }

            if (!message.receiver === userID) {
                return res.status(401).json({ error: "ThatsNotYoursBuddy" });
            }

            await utils.UserManager.dispute(messageID, dispute);

            utils.logs.disputeLog(
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
