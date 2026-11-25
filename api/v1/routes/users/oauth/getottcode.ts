import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getottcode",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const code = await utils.manager.auth.genOneTimeTokenCode(
                res.locals.login.token,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ code });
        },
    );
}
