module.exports = (app, utils) => {
    app.post('/api/v1/users/changeusernameadmin', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const newUsername = (String(packet.newUsername)).toLowerCase();

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) || !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        if (await utils.UserManager.existsByUsername(newUsername)) {
            utils.error(res, 400, "AccountExists");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        await utils.UserManager.changeUsername(targetID, newUsername);

        utils.logs.sendAdminUserLog(username, newUsername, `Admin or mod has updated user's username.\nOld username: ${target}\nNew username: ${newUsername}`, 0xf47420);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}