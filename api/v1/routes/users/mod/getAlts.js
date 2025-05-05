module.exports = (app, utils) => {
    app.get('/api/v1/users/getAlts', utils.cors(), async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        if (!username || !token || !target) {
            utils.error(res, 400, "Missing username, token, or target");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.isAdmin(username) && !await utils.UserManager.isModerator(username)) {
            utils.error(res, 403, "Unauthorized");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target, true)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        const alts = await utils.UserManager.getAlts(targetID);
        const usernames = await utils.UserManager.idListToUsernames(alts);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ alts: usernames });
    });
}