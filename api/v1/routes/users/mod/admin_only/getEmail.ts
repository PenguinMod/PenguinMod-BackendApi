import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getemail",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const email = await utils.UserManager.getEmail(target);

            if (!email) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ email });
        },
    );
}
