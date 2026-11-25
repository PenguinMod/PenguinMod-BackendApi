import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/assignPossition",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const admin = String(packet.admin) === "true";
            const approver = String(packet.approver) === "true";

            const username = res.locals.login.username;

            if (!(await utils.UserManager.existsByUsername(target))) {
                res.status(400).json({ error: "AccountDoesNotExist" });
                return;
            }

            const isAdmin = await utils.UserManager.isAdmin(target);
            const isModerator = await utils.UserManager.isModerator(target);

            await utils.UserManager.setAdmin(target, admin);
            await utils.UserManager.setModerator(target, approver);

            const fields = {};

            if (isAdmin !== admin) {
                fields.Admin = `${isAdmin} -> ${admin}`;
            }
            if (isModerator !== approver) {
                fields.Approver = `${isModerator} -> ${approver}`;
            }

            utils.logs.sendAdminUserLog(
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
