module.exports = (app, utils) => {
    app.get('/api/v1/users/isBanned', async function (req, res) {
        if (typeof req.query.username != "string") {
            utils.error(res, 400, "InvalidRequest");
            return;
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.json({ "banned": await utils.UserManager.isBanned(req.query.username) });
    });
}