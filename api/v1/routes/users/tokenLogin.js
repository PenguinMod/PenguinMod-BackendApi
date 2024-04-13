module.exports = (app, utils) => {
    app.get("/api/v1/users/tokenlogin", async function (req, res) {
        const packet = req.query;

        console.log(packet);

        if (!packet.username || !packet.token) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.existsByUsername(packet.username)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }

        console.log(packet.token, "tl");
        if (!await utils.UserManager.loginWithToken(packet.username, packet.token)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true});
    });
}