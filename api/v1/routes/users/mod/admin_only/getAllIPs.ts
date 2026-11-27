import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getAllIPs",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = makeUsername(String(packet.target));

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                return res.status(404).json({ error: "User not found" });
            }

            const ips = await utils.manager.users.getIpsByID(targetData.id);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ ips });
        },
    );
}
