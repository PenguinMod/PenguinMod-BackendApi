import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/banuserip",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const toggle = String(packet.toggle) === "true";

            const username = res.locals.login.username;

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target, true))
            ) {
                res.status(404).json({ error: "NotFound" });
                return;
            }

            // dont send a message since they cant access the site anyways :bleh:

            await utils.UserManager.banUserIP(target, toggle);

            utils.logs.sendAdminLog(
                {
                    action: `${target}'s IPs have been ${toggle ? "" : "un"}banned`,
                    content: `${username} banned the IPs of ${target}`,
                    fields: {
                        Mod: username,
                        Target: target,
                    },
                },
                utils.logs.pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200).json({ success: true });
        },
    );
}
