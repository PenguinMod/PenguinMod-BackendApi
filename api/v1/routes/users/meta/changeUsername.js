module.exports = (app, utils) => {
    app.post("/api/v1/users/changeUsername", async (req, res) => {
        const packet = req.body;

        const username = String(packet.username).toLowerCase();
        const token = packet.token;
        const newUsername = String(packet.newUsername).toLowerCase();

        if (!username || !token || !newUsername) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        const usernameDoesNotMeetLength = newUsername.length < 3 || newUsername.length > 20;
        const usernameHasIllegalChars = newUsername.match(/[^a-z0-9\-_]/i);
        if (usernameDoesNotMeetLength) {
            utils.error(res, 400, "InvalidLengthUsername");
            return;
        }
        if (usernameHasIllegalChars) {
            utils.error(res, 400, "InvalidUsername");
            return;
        }

        const exists = await utils.UserManager.existsByUsername(newUsername);
        if (exists) {
            utils.error(res, 404, "UsernameTaken");
            return;
        }

        await utils.UserManager.changeUsername(username, newUsername);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    })
}