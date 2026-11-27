import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { makeUsername } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/getAlts",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.query;

            const target = makeUsername(String(packet.target));

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                res.status(404).json({ error: "NotFound" });
                return;
            }

            const alts = await utils.manager.users.getAlts(targetData.id);
            const usernames = await utils.manager.users.idListToUsernames(alts);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ alts: usernames });
        },
    );
}
