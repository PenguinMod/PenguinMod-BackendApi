module.exports = (app, utils) => {
    app.post('/api/v1/misc/getLastPolicyUpdate', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "Reauthenticate")
            return;
        }

        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "Forbidden")
            return;
        }

        const type = packet.type;

        switch (type) {
            case "privacyPolicy":
                await utils.UserManager.setLastPrivacyPolicyUpdate();
                break;
            case "tos":
                await utils.UserManager.setLastTOSUpdate();
                break;
            case "guidelines":
                await utils.UserManager.setLastGuidelinesUpdate();
                break;
            default:
                utils.error(res, 400, "Invalid type")
                return;
        }

        // TODO: send log

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ success: true });
    });
}