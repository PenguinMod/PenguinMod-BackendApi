import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getemail",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const target = makeUsername(String(packet.target));

            const data = await utils.manager.users.getUserData(target);

            if (!data) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ email: data.email });
        },
    );
}
