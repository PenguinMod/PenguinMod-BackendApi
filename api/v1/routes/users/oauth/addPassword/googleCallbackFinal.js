module.exports = (app, utils) => {
    app.get("/api/v1/users/googlecallback/addpasswordfinal", async function (req, res) {
        const packet = req.query;

        const tokens = packet.at;
        const password = packet.password;

        if (!tokens || !password) {
            utils.error(res, 400, "Missing access token or password");
            return;
        }

        const passwordDoesNotMeetLength = packet.password.length < 8 || packet.password.length > 50;
        const passwordMeetsTextInclude = packet.password.match(/[a-z]/) && packet.password.match(/[A-Z]/);
        const passwordMeetsSpecialInclude = packet.password.match(/[0-9]/) && packet.password.match(/[^a-z0-9]/i);
        if (passwordDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthPassword");
            return;
        }
        if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
            utils.error(res, 400, "MissingRequirementsPassword");
            return;
        }

        const oauth2Client = new utils.googleOAuth2Client(
            utils.env.GoogleOAuthClientID,
            utils.env.GoogleOAuthClientSecret,
            `${utils.env.ApiURL}/api/v1/users/googlecallback/addpassword`
        );

        try {
            oauth2Client.setCredentials(JSON.parse(tokens));
        } catch (e) {
            utils.error(res, 400, "Failed to set credentials");
            return;
        }

        const url = 'https://people.googleapis.com/v1/people/me?personFields=names';
        let user;
        try {
            user = await oauth2Client.request({url});
        } catch (e) {
            utils.error(res, 400, "Failed to request user data");
            return;
        }

        const id = user.data.resourceName.split('/')[1];

        const userid = await utils.UserManager.getUserIDByOAuthID("google", id);

        if (!userid) {
            utils.error(res, 400, "User not found");
            return;
        }

        const username = await utils.UserManager.getUsernameByID(userid);

        await utils.UserManager.changePassword(username, password);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIPID(userid, req.realIP);

        res.redirect(`/api/v1/users/sendloginsuccess?token=${token}&username=${username}`);
    });
}