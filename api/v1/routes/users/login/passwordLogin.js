module.exports = (app, utils) => {
    app.post("/api/v1/users/passwordLogin", async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const password = packet.password;

        if (!username || !password) {
            utils.error(res, 400, "Missing username or password");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }

        let token = await utils.UserManager.loginWithPassword(username, password, true);
        if (!token) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}