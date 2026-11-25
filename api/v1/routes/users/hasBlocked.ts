import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/hasblocked",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const targetMeta = await utils.manager.users.getUserData(target);
            if (!targetMeta) {
                return res.status(404).json({ error: "Target not found" });
            }

            const user_id = res.locals.login.id;
            const target_id = targetMeta.id;

            const has_blocked = await utils.manager.users.hasBlocked(
                user_id,
                target_id,
            );

            res.status(200).json({ has_blocked });
        },
    );
}
