import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/resetpassword/verifyemail",
        utils.cors(),
        async function (req, res) {
            const packet = req.query;

            const email = String(packet.email).toLowerCase();
            const state = String(packet.state);

            if (
                !(await utils.UserManager.verifyPasswordResetState(
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

            const username = await utils.UserManager.getUsernameByEmail(email);

            if (!username) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            await utils.UserManager.setEmailVerified(username, true);

            res.redirect(process.env.HomeURL);
        },
    );
}
