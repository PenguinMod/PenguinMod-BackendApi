import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getAlts",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.query;

            const target = String(packet.target).toLowerCase();

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                res.status(404).json({ error: "NotFound" });
                return;
            }

            const alts = await utils.UserManager.getAlts(targetID);
            const usernames = await utils.UserManager.idListToUsernames(alts);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ alts: usernames });
        },
    );
}
