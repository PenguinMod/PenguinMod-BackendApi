import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/scratchoauthcreate", async function (req, res) {
        const packet = req.query;

        const state = String(packet.state);
        const code = String(packet.code);

        if (!state || !code) {
            res.status(400).json({ error: "Missing state or code" });
            return;
        }

        const { valid } = await utils.UserManager.verifyOAuth2State(state);
        if (!valid) {
            res.status(400).json({ error: "Invalid state" });
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

        const username = await fetch(
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
                return false;
            });

        if (!username) {
            return;
        }

        if (username.status !== 200) {
            res.status(500).json({ error: "InternalError" });
            return;
        }

        const existing_userid = await utils.UserManager.getUserIDByOAuthID(
            "scratch",
            username.user.user_id,
        );
        if (existing_userid) {
            // they are stupid. their account already exists. we'll let them be stupid
            const token = await utils.UserManager.newTokenGen(existing_userid);

            await utils.UserManager.addIPID(existing_userid, req.realIP);

            const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

            res.status(200);
            res.redirect(
                `${process.env.HomeURL}/exchangeottcode?code=${ottCode}`,
            );
            return;
        }

        // create the user
        const userdata = await utils.UserManager.makeOAuth2Account(
            "scratch",
            username.user,
            utils,
            res,
        );

        if (!userdata) {
            res.status(400).json({ error: "UnknownError" });
            return;
        }

        const profilePicture = await fetch(
            `https://trampoline.turbowarp.org/avatars/by-username/${username.user.user_name.toLowerCase()}`,
        )
            .then((res) => res.arrayBuffer())
            .catch((e) => {
                res.status(500).json({ error: "InternalError" });
                return new Promise((resolve, reject) => resolve());
            });

        if (!profilePicture) {
            return;
        }

        const pfp_buffer = Buffer.from(profilePicture);

        await utils.UserManager.setProfilePicture(userdata.id, pfp_buffer);

        const accountUsername = userdata.username;
        const token = userdata.token;

        await utils.UserManager.addIPID(userdata.id, req.realIP);
        await utils.logs.sendCreationLog(
            accountUsername,
            userdata.id,
            "",
            "account",
        );

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
}
