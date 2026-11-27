import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { messageId } from "../../../../db/new-types";
import { assertNonNull } from "../../../../../../utils/misc";
import { modResponse } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/modresponse",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const disputeID = messageId(String(packet.disputeID));
            const message = String(packet.message);

            const username = res.locals.login.username;

            const dispute = await utils.manager.messages.getMessage(disputeID);

            if (!dispute) {
                return res.status(404).json({ error: "MessageNotFound" });
            }

            const id = await utils.manager.messages.sendMessage(
                dispute.receiver,
                { type: "disputeResponse", message, previous: disputeID },
                true,
                dispute.projectID,
            );

            modResponse(
                username,
                dispute.receiver,
                id,
                assertNonNull(dispute.dispute),
                message,
            );

            res.status(200).json({ success: true });
        },
    );
}
