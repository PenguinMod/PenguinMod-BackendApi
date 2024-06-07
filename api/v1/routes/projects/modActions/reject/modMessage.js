export default (app, utils) => {
    app.post('/api/v1/projects/modmessage', async (req, res) => {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = packet.target;
        const message = packet.message;

        const disputable = packet.disputable || false;

        if (!username || !token || !target || typeof message !== "string") {
            return utils.error(res, 400, "InvalidData");
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            return utils.error(res, 401, "Invalid credentials");
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            return utils.error(res, 404, "UserNotFound");
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        const id = await utils.UserManager.sendMessage(targetID, {type: "modMessage", message}, disputable, 0);

        utils.logs.modMessage(username, target, id, message);

        res.header('Content-type', "application/json");
        res.send({ success: true });
    });
}