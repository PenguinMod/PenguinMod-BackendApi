import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { sendAdminUserLog } from "../../../../../utils/logs";
import { makeUsername } from "../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/changeusernameadmin",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                res.status(400).json({ error: "UsernameInUse" });
                return;
            }

            await utils.manager.users.changeUsername(
                targetData.id,
                String(packet.newUsername),
            );

            sendAdminUserLog(
                username,
                String(packet.newUsername),
                `Admin or mod has updated user's username.`,
                0xf47420,
                {
                    "Old Username": target,
                    "New Username": String(packet.newUsername),
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
