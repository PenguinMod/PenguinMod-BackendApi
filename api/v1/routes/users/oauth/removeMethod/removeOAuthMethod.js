module.exports = (app, utils) => {
    app.post("/api/v1/users/removeoauthmethod", async function (req, res) {
        // get the method
        const packet = req.body;

        const method = packet.method;
        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!method || !username || !token) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        const methods = await utils.UserManager.getOAuthMethods(username);

        if (!methods.includes(method)) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        await utils.UserManager.removeOAuthMethod(username, method);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "success": true });
    });
}
