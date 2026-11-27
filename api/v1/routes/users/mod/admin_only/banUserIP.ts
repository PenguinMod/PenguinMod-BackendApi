import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/banuserip",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const toggle = String(packet.toggle) === "true";

            const username = res.locals.login.username;

            const userData = await utils.manager.users.getUserData(target);
            if (!userData) {
                res.status(404).json({ error: "UserNotFound" });
                return;
            }

            // dont send a message since they cant access the site anyways :bleh:

            await utils.manager.users.banUserIP(userData.id, toggle);

            sendAdminLog(
                {
                    action: `${target}'s IPs have been ${toggle ? "" : "un"}banned`,
                    content: `${username} banned the IPs of ${target}`,
                    fields: {
                        Mod: username,
                        Target: target,
                    },
                },
                pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200).json({ success: true });
        },
    );
}
