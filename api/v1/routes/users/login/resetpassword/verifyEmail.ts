import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { corsMW } from "../../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/resetpassword/verifyemail",
        corsMW,
        async function (req, res) {
            const packet = req.query;

            const email = String(packet.email).toLowerCase();
            const state = String(packet.state);

            if (
                !(await utils.manager.auth.verifyPasswordResetState(
                    state,
                    email,
                    true,
                ))
            ) {
                res.status(401).json({
                    error: "InvalidState. Your link has most likely expired, please try again.",
                });
                return;
            }

            const userData = await utils.manager.users.getUserByEmail(email);

            if (!userData) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            await utils.manager.users.setEmailVerified(userData.username, true);

            res.redirect(String(process.env.HomeURL));
        },
    );
}
