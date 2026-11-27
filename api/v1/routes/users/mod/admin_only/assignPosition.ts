import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { sendAdminUserLog } from "../../../../../../utils/logs";
import { makeUsername } from "../../../../db/new-types";

// TODO: position is spelled wrong here. needs matching frontend change

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/assignPossition",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = makeUsername(String(packet.target));
            const admin = String(packet.admin) === "true";
            const approver = String(packet.approver) === "true";

            const username = res.locals.login.username;

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData) {
                res.status(400).json({ error: "AccountDoesNotExist" });
                return;
            }

            const isAdmin = targetData.admin;
            const isModerator = targetData.moderator || targetData.admin;

            // TODO: combine to one db request
            await utils.manager.users.setAdmin(targetData.id, admin);
            await utils.manager.users.setModerator(targetData.id, approver);

            const fields: Record<string, string> = {};

            if (isAdmin !== admin) {
                fields.Admin = `${isAdmin} -> ${admin}`;
            }
            if (isModerator !== approver) {
                fields.Approver = `${isModerator} -> ${approver}`;
            }

            sendAdminUserLog(
                username,
                target,
                "Admin or mod has updated user's permissions.",
                0x7f3ddc,
                fields,
            );

            res.status(200).json({ success: true });
        },
    );
}
