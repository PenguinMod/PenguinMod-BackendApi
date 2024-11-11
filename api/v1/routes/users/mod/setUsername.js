module.exports = (app, utils) => {
    app.post('/api/v1/users/changeusernameadmin', utils.cors(), async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const newUsername = (String(packet.newUsername)).toLowerCase();

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        if (await utils.UserManager.existsByUsername(newUsername)) {
            utils.error(res, 400, "UsernameInUse");
            return;
        }

        await utils.UserManager.changeUsername(target, newUsername);

        utils.logs.sendAdminUserLog(username, newUsername, `Admin or mod has updated user's username.`, 0xf47420, [
            {
                name: "Old Username",
                value: target
            },
            {
                name: "New Username",
                value: newUsername
            }
        ]);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}