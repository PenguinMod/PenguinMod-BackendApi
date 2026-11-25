import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setBadges",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const badges = packet.badges;

            const username = res.locals.login.username;

            if (
                !target ||
                !(await utils.UserManager.existsByUsername(target))
            ) {
                res.status(404).json({ error: "UserNotFound" });
                return;
            }

            if (!Array.isArray(badges)) {
                res.status(400).json({ error: "InvalidBadges" });
                return;
            }

            await utils.UserManager.setBadges(target, badges);

            utils.logs.sendAdminUserLog(
                username,
                target,
                "Admin has updated user's badges.",
                0x3d4ddc,
                {
                    Badges: badges.join(", "),
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
