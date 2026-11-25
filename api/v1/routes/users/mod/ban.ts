import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";
import { pmUserAuthor, sendAdminLog } from "../../../../../utils/logs";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/ban",
        ...requireAuth(utils.manager.auth, { require_mod: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const toggle = String(packet.toggle) === "true";
            const time = Math.max(Number(packet.time) || 0, 0);
            const reason = String(packet.reason);
            const remove_follows = String(packet.remove_follows) !== "false";

            if (reason.length > 512) {
                res.status(400).json({ error: "ReasonTooLong" });
                return;
            }

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                res.status(404).json({ error: "TargetNotFound" });
                return;
            }

            if (
                !res.locals.login.isAdmin &&
                (targetData.moderator || targetData.admin)
            ) {
                res.status(403).json({ error: "Unauthorized" });
                return;
            }

            const isTempBanned = targetData.unbanTime > Date.now();
            if (!toggle && isTempBanned) {
                await utils.manager.users.unTempBan(target);
            } else if (toggle && time) {
                await utils.manager.users.tempBanUser(target, reason, time);
            } else {
                await utils.manager.users.setPermBanned(
                    targetData.id,
                    toggle,
                    reason,
                    remove_follows,
                );
            }

            if (toggle && time) {
                await utils.manager.messages.sendMessage(
                    targetData.id,
                    { type: `tempban`, time: time, reason: reason },
                    false,
                );
            } else if (toggle) {
                await utils.manager.messages.sendMessage(
                    targetData.id,
                    { type: "ban", reason: reason },
                    false,
                );
            } else {
                await utils.manager.messages.sendMessage(
                    targetData.id,
                    { type: "unban" },
                    false,
                );
            }

            const fields: Record<string, string> = {
                Mod: username,
                Target: target,
            };

            if (toggle && time) {
                fields.Time = `${time / 1000} seconds (${time / (1000 * 60 * 60)} hours)`;
            }

            fields.Reason = `\`\`\`\n${reason}\n\`\`\``;
            fields.URL = `${process.env.HomeURL}/profile?userid=${targetData.id}`;

            sendAdminLog(
                {
                    action: `User has been ${toggle && time ? "temp " : ""}${toggle ? "" : "un"}banned`,
                    content: `${username} ${toggle ? "" : "un"}banned ${target}`,
                    fields,
                },
                pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            await utils.manager.reports.resolveReports("user", targetData.id);

            res.status(200).json({ success: true });
        },
    );
}
