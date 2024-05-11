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

        // TODO: this is currently pretty basic. we should add a few more requirements
        if (packet.username.length < 3 || packet.username.length > 20) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (packet.password.length < 8 || packet.password.length > 50) {
            utils.error(res, 400, "InvalidData");
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