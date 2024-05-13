module.exports = (app, utils) => {
    app.get('/api/v1/users/userexists', async function (req, res) {
        const packet = req.query;

        const username = packet.username;

        if (!username) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const exists = await utils.UserManager.existsByUsername(username.toLowerCase());

        res.status(200);
        res.header('Content-type', "application/json");
        res.send({ exists: exists });
    });
}