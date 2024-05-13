module.exports = (app, utils) => {
    app.get("/api/v1/users/passwordLogin", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const password = packet.password;

        if (!username || !packet.password) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 401, "InvalidCredentials"); // same error as wrong password to prevent that botting thing
            return;
        }

        let token = await utils.UserManager.loginWithPassword(username, password);
        if (!token) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}