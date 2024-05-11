module.exports = (app, utils) => {
    app.post("/api/v1/users/createAccount", async function (req, res) {
        const packet = req.body;

        const username = packet.username;
        const password = packet.password;

        const email = packet.email || null;
        
        if (typeof username !== "string" || typeof password !== "string" || (email && typeof email !== "string")) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const usernameDoesNotMeetLength = packet.username.length < 3 || packet.username.length > 20;
        const usernameHasIllegalChars = packet.username.match(/[^a-z0-9\-_]/i);
        if (usernameDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthUsername");
            return;
        }
        if (usernameHasIllegalChars) {
            utils.error(res, 400, "InvalidUsername");
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

        if (await utils.UserManager.existsByUsername(packet.username)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        let token = await utils.UserManager.createAccount(packet.username, packet.password);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}