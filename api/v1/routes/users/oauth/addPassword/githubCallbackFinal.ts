import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/githubcallback/addpasswordfinal",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const access_token = String(packet.at);
            const password = String(packet.password);

            if (!access_token || !password) {
                res.status(400).json({
                    error: "Missing access_token or password",
                });
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

            const user = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${access_token}`,
                },
            })
                .then(async (res) => {
                    return { user: await res.json(), status: res.status };
                })
                .catch((e) => {
                    res.status(500).json({ error: "OAuthServerDidNotRespond" });
                    return new Promise((resolve, reject) => resolve());
                });

            if (!user) {
                return;
            }

            if (user.status !== 200) {
                res.status(500).json({ error: "InternalError" });
                return;
            }

            const userid = await utils.UserManager.getUserIDByOAuthID(
                "github",
                user.user.id,
            );
            const username = await utils.UserManager.getUsernameByID(userid);

            const [token] = await Promise.all([
                utils.UserManager.changePassword(username, password),
                utils.UserManager.addIPID(userid, req.realIP),
            ]);

            res.status(200);
            res.header("Content-Type", "application/json");
            res.json({ token, username });
        },
    );
}
