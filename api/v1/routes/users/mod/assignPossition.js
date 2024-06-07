export default (app, utils) => {
    app.post('/api/v1/users/assignPossition', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();
        const admin = packet.admin;
        const approver = packet.approver;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        if (!await utils.UserManager.isAdmin(username)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 400, "AccountDoesNotExist");
            return;
        }

        await utils.UserManager.setAdmin(target, Boolean(admin));
        await utils.UserManager.setModerator(target, Boolean(approver));

        utils.logs.sendAdminUserLog(username, target, "Admin or mod has updated user's permissions.", 0x7f3ddc);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}