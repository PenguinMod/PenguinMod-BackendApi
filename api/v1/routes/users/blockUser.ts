import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/blockuser",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const user_id = res.locals.login.id;

            const target = String(packet.target);

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                return res.status(404).json({ error: "TargetNotFound" });
            }

            if (user_id === targetData.id) {
                return res.status(401).json({ error: "Cannot block yourself" });
            }

            const active = String(packet.active) === "true";

            await utils.manager.users.blockUser(user_id, targetData.id, active);

            res.status(200).json({ success: true });
        },
    );
}
