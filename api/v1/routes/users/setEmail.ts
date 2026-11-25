import type { Application } from "express";
import type { Utils } from "../../../../index";
import { requireAuth } from "../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/setEmail",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const email = String(packet.email).toLowerCase();

            const username = res.locals.login.username;

            if (!utils.UserManager.validateEmail(email)) {
                res.status(400).json({ error: "InvalidEmail" });
                return;
            }

            if (email === res.locals.login.email) {
                res.status(200).json({ error: "ThatsTheSameEmailDingus" });
                return;
            }

            if (await utils.UserManager.emailInUse(email)) {
                res.status(400).json({ error: "EmailAlreadyInUse" });
                return;
            }

            await utils.UserManager.setEmail(username, email);

            res.status(200).json({ success: true });
        },
    );
}
