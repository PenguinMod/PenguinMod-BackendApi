import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get(
        "/api/v1/users/githubcallback/addmethod",
        async function (req, res) {
            const packet = req.query;

            const state = String(packet.state);
            const code = String(packet.code);

            if (!state || !code) {
                res.status(400).json({ error: "Missing state or code" });
                return;
            }

            const { valid, data } =
                await utils.UserManager.verifyOAuth2State(state);
            if (!valid) {
                res.status(400).json({ error: "InvalidState" });
                return;
            }

            const userid = data;

            const methods = await utils.UserManager.getOAuthMethods(userid);

            if (methods.includes("github")) {
                res.status(400).json({ error: "Method already added" });
                return;
            }

            const response = await utils.UserManager.makeOAuth2Request(
                code,
                "github",
            );

            if (!response) {
                res.status(500).json({ error: "OAuthServerDidNotRespond" });
                return;
            }

            const user = await fetch("https://api.github.com/user", {
                headers: {
                    Authorization: `Bearer ${response.access_token}`,
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

            await utils.UserManager.addOAuthMethod(
                userid,
                "github",
                user.user.id,
            );

            const token = await utils.UserManager.newTokenGen(userid);

            const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
        },
    );
}
