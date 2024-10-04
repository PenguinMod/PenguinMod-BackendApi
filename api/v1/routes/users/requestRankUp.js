module.exports = (app, utils) => {
    app.post('/api/v1/users/requestrankup', async function (req, res) {
        const packet = req.body;

        const username = (String(packet.username)).toLowerCase();
        const token = packet.token;

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        const badges = await utils.UserManager.getBadges(username);

        const rank = await utils.UserManager.getRank(username);
        if (rank !== 0) {
            utils.error(res, 400, "AlreadyRankedHighest");
            return;
        }

        const user_id = await utils.UserManager.getIDByUsername(username);

        const signInDate = await utils.UserManager.getFirstLogin(username);
        const userProjects = await utils.UserManager.getProjectsByAuthor(user_id, 0, 3);

        const canRequestRankUp = (userProjects.length >= 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8)     // first signed in 5 days ago
            || badges.length > 0;                       // or we have a badge

        if (!canRequestRankUp) {
            utils.error(res, 403, "Ineligble");
            return;
        }

        await utils.UserManager.setRank(username, 1); // 1 is normal penguin

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}