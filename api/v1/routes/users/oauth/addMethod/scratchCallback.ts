import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { userId } from "../../../../db/new-types";

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
            await utils.manager.auth.verifyOAuth2State(state);
        if (!valid) {
            res.status(400).json({ error: "InvalidState" });
            return;
        }

        const userid = userId(String(data));

        const methods = await utils.manager.auth.getOAuthMethods(userid);

        if (methods.includes("scratch")) {
            res.status(400).json({ error: "Method already added" });
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
            console.error(`Error with oauth status: ${JSON.stringify(user)}`);
            res.status(500).json({ error: "InternalError" });
            return;
        }

        await utils.manager.auth.addOAuthMethod(
            userid,
            "scratch",
            user.user.user_id,
        );

        const token = await utils.manager.auth.newTokenGen(userid);

        const ottCode = await utils.manager.auth.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
}
