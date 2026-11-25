import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getadmins",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const admins = await utils.manager.users.getAllAdmins();

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ admins: admins });
        },
    );
}
