import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/projects/toggleviewing",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const toggle = String(packet.toggle) === "true";
            const username = res.locals.login.username;

            await utils.UserManager.setRuntimeConfigItem(
                "viewingEnabled",
                toggle,
            );

            utils.logs.sendAdminLog(
                {
                    action: "Project viewing has been toggled",
                    content: `${username} toggled project viewing to ${toggle}`,
                    fields: {
                        Admin: username,
                        Status: toggle,
                    },
                },
                utils.logs.pmUserAuthor(username),
                0xaf1157,
            );

            res.status(200).json({ success: true });
        },
    );
}
