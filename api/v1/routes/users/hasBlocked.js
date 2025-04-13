module.exports = (app, utils) => {
    app.get('/api/v1/users/hasblocked', utils.cors(), async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        const target = packet.target;

        if (!target || !await utils.UserManager.existsByUsername(target))
            utils.error(res, 404, "Target not found");

        const user_id = await utils.UserManager.getIDByUsername(username);
        const target_id = await utils.UserManager.getIDByUsername(target);

        const has_blocked = await utils.UserManager.hasBlocked(user_id, target_id);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ has_blocked });
    });
}