module.exports = (app, utils) => {
    app.get("/api/v1/users/removeoauthmethod", async function (req, res) {
        // get the method
        const packet = req.query;

        const method = packet.method;
        const username = packet.username;
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
    });
}