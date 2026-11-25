import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/scratchoauthlogin", async function (req, res) {
        const packet = req.query;

        const state = String(packet.state);
        const code = String(packet.code);

        if (!state || !code) {
            res.status(400).json({ error: "Missing state or code" });
            return;
        }

        const { valid } = await utils.manager.auth.verifyOAuth2State(state);
        if (!valid) {
            res.status(400).json({ error: "Invalid state" });
            return;
        }

        // now make the request
        const response = await utils.manager.auth.makeOAuth2Request(
            code,
            "scratch",
        );

        if (!response) {
            res.status(500).json({ error: "OAuthServerDidNotRespond" });
            return;
        }

        const user = await fetch(
            "https://oauth2.scratch-wiki.info/w/rest.php/soa2/v0/user",
            {
                headers: {
                    Authorization: `Bearer ${btoa(response.access_token)}`,
                },
            },
        )
            .then(async (res) => {
                return { user: await res.json(), status: res.status };
            })
            .catch((e) => {
                res.status(500).json({ error: "OAuthServerDidNotRespond" });
                console.error("OAuth server didn't respond:", e);
            });

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            res.status(500).json({ error: "InternalError" });
            return;
        }

        const userid = await utils.manager.auth.getUserIDByOAuthID(
            "scratch",
            user.user.user_id,
        );

        if (!userid) {
            // the method is not connected with an account
            res.status(400).json({ error: "MethodNotConnected" });
            return;
        }

        const token = await utils.manager.auth.newTokenGen(userid);

        await utils.manager.users.addIPID(userid, req.realIP);

        const ottCode = await utils.manager.auth.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
}
