import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/removeoauthmethod",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            // get the method
            const packet = req.body;

            const method = String(packet.method);

            const id = res.locals.login.id;
            const hasPassword = !!res.locals.login.fullMeta.password;

            const methods = await utils.UserManager.getOAuthMethods(id);

            if (!methods.includes(method)) {
                res.status(404).json({ error: "MethodNotConnected" });
                return;
            }

            if (methods.length === 1 && !hasPassword) {
                return res.status(400).json({
                    error: "You would get locked out of your account",
                });
            }

            await utils.UserManager.removeOAuthMethod(id, method);

            res.status(200).json({ success: true });
        },
    );
}
