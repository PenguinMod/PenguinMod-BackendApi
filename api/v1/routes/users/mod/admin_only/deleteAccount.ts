import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/deleteaccount",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const reason = String(packet.reason);

            if (reason.length > 512) {
                return res.status(400).json({ error: "ReasonTooLong" });
            }

            const username = res.locals.login.username;

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target, true))
            ) {
                return res.status(404).json({ error: "TargetNotFound" });
            }

            const success = await utils.UserManager.deleteAccount(target);

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
