/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {import("express").Application} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/login", async (req, res) => {
        const packet = req.query;

        const code = String(packet.code);
        const state = String(packet.state);

        if (!code || !state) {
            res.status(400).json({ error: "Missing code or state" });
            return;
        }

        const { valid } = await utils.UserManager.verifyOAuth2State(state);
        if (!valid) {
            res.status(400).json({ error: "Invalid state" });
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            process.env.GoogleOAuthClientID,
            process.env.GoogleOAuthClientSecret,
            `${process.env.ApiURL}/api/v1/users/googlecallback/login`,
        );

        let r;
        try {
            r = await oauth2Client.getToken(code);
        } catch (e) {
            res.status(400).json({ error: "Failed to get token" });
            return;
        }
        const tokens = r.tokens;

        oauth2Client.setCredentials(tokens);

        const url =
            "https://people.googleapis.com/v1/people/me?personFields=names";
        let user;
        const try_user = async (tries) => {
            if (tries > 3) {
                res.status(500).json({ error: "Google api failed to respond" });
                return false;
            }

            try {
                user = await oauth2Client.request({ url });
            } catch (e) {
                console.warn("Google api failed to respond: " + e);
                return await new Promise((resolve) =>
                    setTimeout(
                        () => try_user(tries + 1).then(resolve),
                        200 * (1 + Math.random()),
                    ),
                );
            }

            return true;
        };
        if (!(await try_user(0))) {
            return;
        }

        const id = user.data.resourceName.split("/")[1];

        const userid = await utils.UserManager.getUserIDByOAuthID("google", id);

        if (!userid) {
            res.status(400).json({ error: "UserID not found" });
            return;
        }

        const token = await utils.UserManager.newTokenGen(userid);

        await utils.UserManager.addIPID(userid, req.realIP);

        const ottCode = await utils.UserManager.genOneTimeTokenCode(token);

        res.status(200);
        res.redirect(`${process.env.HomeURL}/exchangeottcode?code=${ottCode}`);
    });
};
