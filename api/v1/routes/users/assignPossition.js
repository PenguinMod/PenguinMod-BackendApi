module.exports = (app, utils) => {
    app.get('/api/v1/users/assignPossition', async function (req, res) {
        const packet = req.query;
        if (!await utils.UserManager.loginWithToken(packet.user, packet.token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        if (!await utils.UserManager.isAdmin(packet.user)) {
            utils.error(res, 403, "FeatureDisabledForThisAccount");
            return;
        }

        await utils.UserManager.setAdmin(packet.target, utils.Cast.toBoolean(packet.admin));
        await utils.UserManager.setApprover(packet.target, utils.Cast.toBoolean(packet.approver));

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": 'AppliedStatus' });
    });
}