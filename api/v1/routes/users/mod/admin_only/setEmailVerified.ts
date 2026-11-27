import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";
import { makeUsername } from "../../../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setemailverified",
        ...requireAuth(utils.manager.auth, { require_admin: true }),
        async function (req, res) {
            const packet = req.body;

            const user = makeUsername(String(packet.user));
            const value = String(packet.value) !== "false";

            const data = await utils.manager.users.getUserData(user);
            if (!data) {
                return res
                    .status(400)
                    .json({ error: "Thats not a real user buddy" });
            }

            await utils.manager.users.setEmailVerified(data.id, value);

            res.status(200).json({ success: true });
        },
    );
}
