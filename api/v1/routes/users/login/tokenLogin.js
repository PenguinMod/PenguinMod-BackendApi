module.exports = (app, utils) => {
    app.get("/api/v1/users/tokenlogin", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!username || !token) {
            utils.error(res, 400, "Missing username or token");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }
        
        if (!await utils.UserManager.loginWithToken(username, token, true)) {
            utils.error(res, 401, "InvalidCredentials");
            return;
        }
        
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true});
    });
}