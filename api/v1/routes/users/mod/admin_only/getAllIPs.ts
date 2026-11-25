import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getAllIPs",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target);

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target, true))
            ) {
                return res.status(404).json({ error: "User not found" });
            }

            const ips = await utils.UserManager.getIPs(target);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ ips });
        },
    );
}
