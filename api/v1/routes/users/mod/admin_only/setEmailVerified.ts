import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setemailverified",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const user = String(packet.user);
            const value = String(packet.value) !== "false";

            if (!user || !(await utils.manager.users.existsByUsername(user))) {
                return res
                    .status(400)
                    .json({ error: "Thats not a real user buddy" });
            }

            await utils.manager.users.setEmailVerified(user, value);

            res.status(200).json({ success: true });
        },
    );
}
