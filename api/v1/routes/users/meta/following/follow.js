module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/follow", async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;

        const toggle = packet.toggle;

        if (!username || !token || !target || typeof toggle !== "boolean") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(token, username)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        await utils.UserManager.followUser(username, target, toggle);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}