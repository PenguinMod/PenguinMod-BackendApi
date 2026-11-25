import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { watchlist } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/putonwatchlist",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const enabled = String(packet.enabled) === "true";

            const username = res.locals.login.username;

            await utils.manager.users.toggleWatchlist(target, enabled);

            watchlist.putOnWatchlist(target, username);

            res.status(200).json({ success: true });
        },
    );
}
