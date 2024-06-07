export default (app, utils) => {
    app.post('/api/v1/misc/markTOSAsRead', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }

        await utils.UserManager.markTOSAsRead(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ success: true });
    });
}