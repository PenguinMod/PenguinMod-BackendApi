import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { watchlist } from "../../../../../utils/logs";
import { makeUsername } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/putonwatchlist",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const enabled = String(packet.enabled) === "true";

            const data = await utils.manager.users.getUserData(target);
            if (!data) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            await utils.manager.users.toggleWatchlist(data.id, enabled);

            watchlist.putOnWatchlist(target, res.locals.login.username);

            res.status(200).json({ success: true });
        },
    );
}
