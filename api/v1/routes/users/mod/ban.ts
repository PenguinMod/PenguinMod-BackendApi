import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

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

            // TODO: we're making 4 separate db requests that really all get the same info. combine to one
            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                res.status(404).json({ error: "TargetNotFound" });
                return;
            }

            if (
                !res.locals.login.isAdmin &&
                (await utils.UserManager.hasModPerms(target))
            ) {
                res.status(403).json({ error: "Unauthorized" });
                return;
            }

            const isTempBanned = await utils.UserManager.isTempBanned(target);
            if (!toggle && isTempBanned) {
                await utils.UserManager.unTempBan(target);
            } else if (toggle && time) {
                await utils.UserManager.tempBanUser(target, reason, time);
            } else {
                await utils.UserManager.setPermBanned(
                    target,
                    toggle,
                    reason,
                    remove_follows,
                );
            }

            if (toggle && time) {
                await utils.UserManager.sendMessage(
                    targetID,
                    { type: `tempban`, time: time, reason: reason },
                    false,
                    0,
                );
            } else if (toggle) {
                await utils.UserManager.sendMessage(
                    targetID,
                    { type: "ban", reason: reason },
                    false,
                    0,
                );
            } else {
                await utils.UserManager.sendMessage(
                    targetID,
                    { type: "unban" },
                    false,
                    0,
                );
            }

            const fields = {
                Mod: username,
                Target: target,
            };

            if (toggle && time) {
                fields.Time = `${time / 1000} seconds (${time / (1000 * 60 * 60)} hours)`;
            }

            fields.Reason = `\`\`\`\n${reason}\n\`\`\``;
            fields.URL = `${process.env.HomeURL}/profile?userid=${targetID}`;

            utils.logs.sendAdminLog(
                {
                    action: `User has been ${toggle && time ? "temp " : ""}${toggle ? "" : "un"}banned`,
                    content: `${username} ${toggle ? "" : "un"}banned ${target}`,
                    fields,
                },
                utils.logs.pmUserAuthor(username),
                toggle ? 0xc40404 : 0x45efc6,
            );

            await utils.UserManager.resolveReports("user", targetID);

            res.status(200).json({ success: true });
        },
    );
}
