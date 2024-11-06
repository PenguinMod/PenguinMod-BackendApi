module.exports = (app, utils) => {
    app.post("/api/v1/users/changePassword", async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const old_password = packet.old_password;
        const new_password = packet.new_password;

        if (!username || !old_password || !new_password) {
            utils.error(res, 400, "Missing username, old_password, or new_password");
            return;
        }

        if (typeof username !== "string" && typeof old_password !== "string" && typeof new_password !== "string") {
            utils.error(res, 400, "Missing username, old_password, or new_password");
            return;
        }

        if (new_password.length < 6 || new_password.length > 20) {
            utils.error(res, 400, "InvalidPassword");
            return;
        }

        if (!await utils.UserManager.loginWithPassword(username, old_password)) {
            utils.error(res, 401, "Invalid Login");
            return;
        }

        await utils.UserManager.changePassword(username, new_password);

        const token = await utils.UserManager.newTokenGen(username);

        await utils.UserManager.addIP(username, req.realIP);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "token": token });
    });
}