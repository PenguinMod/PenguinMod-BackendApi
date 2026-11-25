import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

/* eslint-disable */

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/massbanregex",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            res.status(420);
            res.send({
                error: "This endpoint has been disabled. Contact ian if you really need it.",
            });

            return;

            /*
            const toggle = String(packet.toggle) === "true";

            const targetRegex = packet.targetRegex;

            const username = res.locals.login.username;

            const count = await utils.UserManager.massBanByUsername(
                targetRegex,
                toggle,
            );

            sendAdminLog(
                {
                    action: `Admin has mass ${toggle ? "" : "un"}banned by regex \`${targetRegex}\``,
                    content: `${username} ${toggle ? "" : "un"}banned by regex: \`${targetRegex}\``,
                    fields: {
                        Mod: username,
                        "Target Regex": `\`${targetRegex}\``,
                        "Count banned": `${count}`,
                    },
                },
                pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ success: true, count });
            */
        },
    );
}
