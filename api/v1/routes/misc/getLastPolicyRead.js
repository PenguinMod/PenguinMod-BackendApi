module.exports = (app, utils) => {
    app.get('/api/v1/misc/getLastPolicyRead', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }

        const lastPolicyRead = await utils.UserManager.getLastPolicyRead(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(lastPolicyRead); // its already an object
    });
}