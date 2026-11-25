import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getdisputes",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const page = utils.handle_page(req.query.page);
            const pageSize = Number(process.env.PageSize || 20);

            const disputes = await utils.UserManager.getRecentDisputes(
                page,
                pageSize,
            );

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ disputes });
        },
    );
}
