import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/verifyfollowers",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target);

            const userData = await utils.manager.users.getUserData(target);
            if (!userData) {
                return res.status(404).json({ error: "UserNotFound" });
            }

            await utils.manager.users.verifyFollowers(userData.id);

            res.status(200).json({ success: true });
        },
    );
}
