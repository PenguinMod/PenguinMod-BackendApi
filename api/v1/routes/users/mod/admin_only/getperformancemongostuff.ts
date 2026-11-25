import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { handle_page } from "../../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/perfgetworstoffenders",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.query;

            const page = handle_page(packet.page);

            const items = await utils.manager.misc.getWorstOffenders(
                page,
                Number(process.env.PageSize) || 20,
            );

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ items });
        },
    );
}
