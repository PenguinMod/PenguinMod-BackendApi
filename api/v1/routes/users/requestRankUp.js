module.exports = (app, utils) => {
    app.get('/api/v1/users/requestRankUp', async function (req, res) {
        const packet = req.body;

        if (!UserManager.loginWithToken(packet.username, packet.token)) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }

        const username = utils.Cast.toString(packet.username);
        const badges = utils.UserManager.getBadges(username);

        let rank = utils.UserManager.getRank(username);
        if (rank !== 0) {
            utils.error(res, 400, "AlreadyRankedHighest");
            return;
        }

        const signInDate = utils.UserManager.getFirstLogin(username);
        const userProjects = await utils.UserManager.getProjectsByAuthor(username);

        const canRequestRankUp = (userProjects.length > 3 // if we have 3 projects and
            && (Date.now() - signInDate) >= 4.32e+8)     // first signed in 5 days ago
            || badges.length > 0;                       // or we have a badge

        if (!canRequestRankUp) {
            utils.error(res, 403, "Ineligble");
            return;
        }

        await utils.UserManager.getRank(username);
        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "success": true });
    });
}