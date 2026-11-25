import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

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
                if (!(await utils.UserManager.existsByUsername(target))) {
                    res.status(404).json({ error: `UserNotFound ${target}` });
                    return;
                }
                const current_badges =
                    await utils.UserManager.getBadges(target);
                const merged = removing
                    ? current_badges.filter((x) => !badges.includes(x))
                    : badges.concat(current_badges);
                const uniqueOnly = [...new Set(merged)];

                await utils.UserManager.setBadges(target, uniqueOnly);
            }

            utils.logs.sendAdminUserLog(
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
