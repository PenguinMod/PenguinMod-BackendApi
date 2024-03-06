module.exports = (app, utils) => {
    app.get("/api/v1/users/tokenLogin", async function (req, res) {
        const packet = req.params;

        if (!packet.username || !packet.token) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.existsByUsername(packet.username)) {
            utils.error(res, 401, "InvalidCredentials"); // same error as wrong token to prevent that botting thing
            return;
        }

        if (!await utils.UserManager.loginWithToken(packet.username, packet.token)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true});
    });
}