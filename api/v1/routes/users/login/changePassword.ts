import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/changePassword",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const old_password = String(packet.old_password);
            const new_password = String(packet.new_password);
            if (!old_password || !new_password) {
                res.status(400).json({
                    error: "Missing old_password or new_password",
                });
                return;
            }
            if (
                typeof old_password !== "string" &&
                typeof new_password !== "string"
            ) {
                res.status(400).json({
                    error: "Missing old_password or new_password",
                });
                return;
            }
            const passwordDoesNotMeetLength =
                new_password.length < 8 || new_password.length > 50;
            const passwordMeetsTextInclude =
                new_password.match(/[a-z]/) && new_password.match(/[A-Z]/);
            const passwordMeetsSpecialInclude =
                new_password.match(/[0-9]/) && new_password.match(/[^a-z0-9]/i);
            if (passwordDoesNotMeetLength) {
                res.status(400).json({ error: "InvalidLengthPassword" });
                return;
            }
            if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
                res.status(400).json({ error: "MissingRequirementsPassword" });
                return;
            }

            const username = res.locals.login.username;
            if (
                !(
                    await utils.manager.auth.loginWithPassword(
                        username,
                        old_password,
                        false,
                    )
                ).ok
            ) {
                res.status(401).json({ error: "Invalid Login" });
                return;
            }

            const newToken = await utils.manager.auth.changePassword(
                res.locals.login.id,
                new_password,
            );

            await utils.manager.users.addIP(res.locals.login.id, req.realIP);

            res.status(200).json({ token: newToken });
        },
    );
}
