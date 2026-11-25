import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/modmessage",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target);
            const message = String(packet.message);

            const disputable = String(packet.disputable) === "true";

            const username = res.locals.login.username;

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            const id = await utils.manager.messages.sendMessage(
                targetID,
                { type: "modMessage", message },
                disputable,
                0,
            );

            utils.logs.modMessage(username, target, id, message);

            res.status(200).json({ success: true });
        },
    );
}
