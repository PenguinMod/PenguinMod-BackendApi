export default (app, utils) => {
    app.post("/api/v1/users/createAccount", async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const password = packet.password;

        const email = packet.email || "";
        
        if (typeof username !== "string" || typeof password !== "string" || typeof email !== "string") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        // prevents usernames having unicode & non-scratch limits (since pm projects are built with scratch limits in mind)
        const usernameDoesNotMeetLength = username.length < 3 || username.length > 20;
        const usernameHasIllegalChars = username.match(/[^a-z0-9\-_]/i);
        if (usernameDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthUsername");
            return;
        }
        if (usernameHasIllegalChars) {
            utils.error(res, 400, "InvalidUsername");
            return;
        }

        // only allows ""complex"" passwords (also seperate regexes since regex just needs to go through each letter to find one match)
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

        if (await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        let token = await utils.UserManager.createAccount(username, packet.password, email);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}