module.exports = (app, utils) => {
    app.post("/api/v1/users/resetpassword/reset", async (req, res) => {
        const packet = req.body;

        const email = packet.email;
        const state = packet.state;
        const password = packet.password;

        if (!await utils.UserManager.verifyPasswordResetState(state)) {
            utils.error(res, 401, "InvalidState");
            return;
        }

        const passwordDoesNotMeetLength = password.length < 8 || password.length > 50;
        const passwordMeetsTextInclude = password.match(/[a-z]/) && password.match(/[A-Z]/);
        const passwordMeetsSpecialInclude = password.match(/[0-9]/) && password.match(/[^a-z0-9]/i);
        if (passwordDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthPassword");
            return;
        }
        if (!(passwordMeetsTextInclude && passwordMeetsSpecialInclude)) {
            utils.error(res, 400, "MissingRequirementsPassword");
            return;
        }

        const username = await utils.UserManager.getUsernameByEmail(email);

        await utils.UserManager.changePassword(username, password);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    })
}