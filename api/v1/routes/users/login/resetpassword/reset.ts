import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { corsMW } from "../../../../../../utils/misc";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/resetpassword/reset",
        corsMW,
        async function (req, res) {
            const packet = req.body;

            const email = String(packet.email).toLowerCase();
            const state = String(packet.state);
            const password = String(packet.password);

            if (
                !(await utils.manager.auth.verifyPasswordResetState(
                    state,
                    email,
                ))
            ) {
                res.status(401).json({ error: "InvalidState" });
                return;
            }

            const passwordDoesNotMeetLength =
                password.length < 8 || password.length > 50;
            const passwordMeetsTextInclude =
                password.match(/[a-z]/) && password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                password.match(/[0-9]/) && password.match(/[^a-z0-9]/i);
            if (passwordDoesNotMeetLength) {
                res.status(400).json({ error: "InvalidLengthPassword" });
                return;
            }
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                res.status(400).json({ error: "MissingRequirementsPassword" });
                return;
            }

            const userData = await utils.manager.users.getUserByEmail(email);

            if (!userData) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            const token = await utils.manager.auth.changePassword(
                userData.id,
                password,
            );

            res.status(200);
            res.header("Content-Type", "application/json");
            res.send({ token });
        },
    );
}
