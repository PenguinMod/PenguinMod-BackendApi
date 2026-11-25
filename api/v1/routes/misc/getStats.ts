import type { Application } from "express";
import type { Utils } from "../../../../index";
import { maybeAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/misc/getStats",
        maybeAuth(utils.manager.auth),
        async function (req, res) {
            const stats: Record<string, unknown> =
                await utils.manager.misc.getStats();

            if (res.locals.login && res.locals.login.isMod) {
                // TODO: allow to get arbitrary months back
                stats.accountsOverTime =
                    await utils.manager.misc.getAccountsOverTime(12);
            }

            res.status(200).json(stats);
        },
    );
}
