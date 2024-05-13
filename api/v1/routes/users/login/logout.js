module.exports = (app, utils) => {
    app.post("/api/v1/users/logout", async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (typeof username !== "string" && typeof token !== "string") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidData");
            return;
        }

        await utils.UserManager.logout(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}