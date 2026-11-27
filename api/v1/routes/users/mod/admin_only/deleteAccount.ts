import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/deleteaccount",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const reason = String(packet.reason);

            if (reason.length > 512) {
                return res.status(400).json({ error: "ReasonTooLong" });
            }

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                return res.status(404).json({ error: "TargetNotFound" });
            }

            const success = await utils.manager.users.deleteAccount(
                targetData.id,
            );

            sendAdminLog(
                {
                    action: `User's account has been deleted`,
                    content: `${username} deleted ${target}'s account`,
                    fields: {
                        Mod: username,
                        Target: target,
                        Reason: `\`\`\`\n${reason}\n\`\`\``,
                    },
                },
                pmUserAuthor(username),
                0xc40404,
            );

            res.status(success ? 200 : 500);
            res.header("Content-type", "application/json");
            res.send({ success });
        },
    );
}
