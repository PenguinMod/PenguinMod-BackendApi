import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/addscratchlogin", async function (req, res) {
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

        if (methods.includes("scratch")) {
            res.status(400).json({ error: "Method already added" });
            return;
        }

        // now make the request
        const response = await utils.UserManager.makeOAuth2Request(
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
                return new Promise((resolve, reject) => resolve());
            });

        if (!user) {
            return;
        }

        if (user.status !== 200) {
            console.error(`Error with oauth status: ${JSON.stringify(user)}`);
            res.status(500).json({ error: "InternalError" });
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        await utils.UserManager.addOAuthMethod(
            userid,
            "scratch",
            user.user.user_id,
        );

        const token = await utils.UserManager.newTokenGen(userid);

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
}
