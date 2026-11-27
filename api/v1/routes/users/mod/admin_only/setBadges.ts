import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { sendAdminUserLog } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setBadges",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const badges = packet.badges;

            const username = res.locals.login.username;

            const data = await utils.manager.users.getUserData(target);
            if (!data) {
                res.status(404).json({ error: "UserNotFound" });
                return;
            }

            if (!Array.isArray(badges)) {
                res.status(400).json({ error: "InvalidBadges" });
                return;
            }

            await utils.manager.users.setBadges(data.id, badges);

            const old_badges = res.locals.login.badges;

            let diff = "```diff\n";
            const newDiff = badges.filter((x) => !old_badges?.includes(x));
            const oldDiff = old_badges.filter((x) => !badges.includes(x));
            for (const word of newDiff) {
                diff += `+ ${word}\n`;
            }
            for (const word of oldDiff) {
                diff += `- ${word}\n`;
            }

            sendAdminUserLog(
                username,
                target,
                "Admin has updated user's badges.",
                0x3d4ddc,
                {
                    Badges: diff,
                },
            );

            res.status(200).json({ success: true });
        },
    );
}
