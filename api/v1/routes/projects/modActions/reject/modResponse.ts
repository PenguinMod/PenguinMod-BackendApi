import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/modresponse",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const disputeID = String(packet.disputeID);
            const message = String(packet.message);

            const username = res.locals.login.username;

            const dispute = await utils.UserManager.getMessage(disputeID);

            if (!dispute) {
                return res.status(404).json({ error: "MessageNotFound" });
            }

            const id = await utils.UserManager.sendMessage(
                dispute.receiver,
                { type: "disputeResponse", message, previous: disputeID },
                true,
                dispute.projectID,
            );

            const disputer = await utils.UserManager.getUsernameByID(
                dispute.receiver,
            );

            utils.logs.modResponse(
                username,
                disputer,
                id,
                dispute.dispute,
                message,
            );

            res.status(200).json({ success: true });
        },
    );
}
