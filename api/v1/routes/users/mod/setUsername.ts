import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { sendAdminUserLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/changeusernameadmin",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const newUsername = String(packet.newUsername).toLowerCase();

            const username = res.locals.login.username;

            if (await utils.manager.users.existsByUsername(newUsername, true)) {
                res.status(400).json({ error: "UsernameInUse" });
                return;
            }

            await utils.manager.users.changeUsername(
                target,
                newUsername,
                String(packet.newUsername),
            );

            sendAdminUserLog(
                username,
                newUsername,
                `Admin or mod has updated user's username.`,
                0xf47420,
                {
                    "Old Username": target,
                    "New Username": newUsername,
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
