import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

const cached: { item: null | object; time: number } = {
    item: null,
    time: 0,
};

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getuserstats",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const hour = 1000 * 60 * 60;
            const day = hour * 24;
            if (cached.time + day >= Date.now()) {
                res.status(200);
                res.header("Content-type", "application/json");
                res.send({ stats: cached.item });
                return;
            }

            const stats = await utils.manager.misc.getUserStats();

            cached.item = stats;
            cached.time = Date.now();

            res.status(200);
            res.header("Content-type", "application/json");
            res.send({ stats });
        },
    );
}
