import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { modMessage } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/modmessage",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const message = String(packet.message);

            const disputable = String(packet.disputable) === "true";

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            const id = await utils.manager.messages.sendMessage(
                targetData.id,
                { type: "modMessage", message },
                disputable,
            );

            modMessage(username, target, id, message);

            res.status(200).json({ success: true });
        },
    );
}
