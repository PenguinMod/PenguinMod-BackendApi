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

            const target_id = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!target_id) {
                return res.status(404).json({ error: "Target not found" });
            }

            if (user_id === target_id) {
                return res.status(401).json({ error: "Cannot block yourself" });
            }

            const active = String(packet.active) === "true";

            await utils.UserManager.blockUser(user_id, target_id, active);

            res.status(200).json({ success: true });
        },
    );
}
