import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/toggleaccountcreation",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";

            const username = res.locals.login.username;

            await utils.manager.misc.setRuntimeConfigItem(
                "accountCreationEnabled",
                toggle,
            );

            sendAdminLog(
                {
                    action: "Account creation has been toggled",
                    content: `${username} toggled account creation to ${toggle}`,
                    fields: {
                        Admin: username,
                        Status: String(toggle),
                    },
                },
                pmUserAuthor(username),
                0xaf1157,
            );

            res.status(200).json({ success: true });
        },
    );
}
