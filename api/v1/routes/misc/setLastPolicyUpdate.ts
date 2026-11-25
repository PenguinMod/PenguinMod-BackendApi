import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/misc/setLastPolicyUpdate",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const username = res.locals.login.username;
            const types = packet.types;

            if (!Array.isArray(types)) {
                return res.status(400).json({ error: "ExpectedArray" });
            }

            for (const type of types) {
                switch (type) {
                    case "privacyPolicy":
                        await utils.manager.misc.setLastPrivacyPolicyUpdate();
                        break;
                    case "tos":
                        await utils.manager.misc.setLastTOSUpdate();
                        break;
                    case "guidelines":
                        await utils.manager.misc.setLastGuidelinesUpdate();
                        break;
                    default:
                        res.status(400).json({ error: "Invalid type" });
                        return;
                }
            }

            sendAdminLog(
                {
                    action: "Last policy update has been set",
                    content: `${username} set the last policy update for ${types}`,
                    fields: {
                        Admin: username,
                        Types: `\`${types}\``,
                        Date: new Date().toISOString(),
                    },
                },
                pmUserAuthor(username),
                0xff33de,
            );

            res.status(200).json({ success: true });
        },
    );
}
