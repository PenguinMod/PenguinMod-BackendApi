import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { sendAdminUserLog } from "../../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setbadgesmultiple",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const targets = packet.targets;
            const badges = packet.badges;
            const removing = String(packet.removing) === "true";

            const username = res.locals.login.username;

            if (!Array.isArray(targets)) {
                res.status(400).json({ error: "InvalidTargets" });
                return;
            }

            if (!Array.isArray(badges)) {
                res.status(400).json({ error: "InvalidBadges" });
                return;
            }

            for (const t of targets) {
                const target = t.toLowerCase();
                const targetData =
                    await utils.manager.users.getUserData(target);
                if (!targetData) {
                    res.status(404).json({
                        error: `UserNotFound`,
                        user: target,
                    });
                    return;
                }
                const current_badges = targetData.badges;
                const merged = removing
                    ? current_badges.filter((x) => !badges.includes(x))
                    : badges.concat(current_badges);
                const uniqueOnly = [...new Set(merged)];

                await utils.manager.users.setBadges(target, uniqueOnly);
            }

            sendAdminUserLog(
                username,
                targets[0],
                `Admin has updated ${targets.length} user's badges.`,
                0x3d4ddc,
                {
                    Badges: badges.join(", "),
                    Targets: targets.join(", ").substring(0, 1024),
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
