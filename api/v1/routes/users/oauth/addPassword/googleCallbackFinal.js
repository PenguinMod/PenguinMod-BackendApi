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
    app.post(
        "/api/v1/users/googlecallback/addpasswordfinal",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const tokens = String(packet.at);
            const password = String(packet.password);

            if (!tokens || !password) {
                res.status(400).json({
                    error: "Missing access token or password",
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

            const oauth2Client = new utils.googleOAuth2Client(
                process.env.GoogleOAuthClientID,
                process.env.GoogleOAuthClientSecret,
                `${process.env.ApiURL}/api/v1/users/googlecallback/addpassword`,
            );

            try {
                oauth2Client.setCredentials(JSON.parse(tokens));
            } catch (e) {
                res.status(400).json({ error: "Failed to set credentials" });
                return;
            }

            const url =
                "https://people.googleapis.com/v1/people/me?personFields=names";
            let user;
            try {
                user = await oauth2Client.request({ url });
            } catch (e) {
                res.status(400).json({ error: "Failed to request user data" });
                return;
            }

            const id = user.data.resourceName.split("/")[1];

            const userid = await utils.UserManager.getUserIDByOAuthID(
                "google",
                id,
            );

            if (!userid) {
                res.status(400).json({ error: "User not found" });
                return;
            }

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
};
