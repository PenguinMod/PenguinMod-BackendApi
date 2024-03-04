module.exports = (app, utils) => {
    app.get('/api/v1/users/profile', async function (req, res) {
        const username = utils.Cast.toString(req.query.username);
        const includeBio = utils.Cast.toBoolean(req.query.bio);
    
        if (typeof username !== "string") {
            utils.error(res, 400, "NoUserSpecified")
            return;
        }
        if (await utils.UserManager.isBanned(username)) {
            utils.error(res, 404, "NotFound")
            return;
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json(utils.generateProfileJSON(utils.UserManager, username, includeBio));
    });
}