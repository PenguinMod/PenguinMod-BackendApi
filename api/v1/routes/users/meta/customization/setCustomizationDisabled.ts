import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    /*
    app.post(
        "/api/v1/users/customization/setCustomizationDisabled",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const isEnabled = String(packet.toggle) === "true";

            const username = res.locals.login.username;

            await utils.UserManager.setUserCustomizationDisabled(
                target,
                !isEnabled,
            );

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin has updated user's ability to customize their profile.",
                0x8c03fc,
                {
                    "Is Enabled?": String(isEnabled),
                },
            );

            res.status(200).json({ success: true });
        },
    );
    */
}
