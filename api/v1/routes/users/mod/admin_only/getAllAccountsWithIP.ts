import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getAllAccountsWithIP",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target);

            const users =
                await utils.manager.users.getAllAccountsWithIP(target);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ users });
        },
    );
}
