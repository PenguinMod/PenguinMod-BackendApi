module.exports = (app, utils) => {
    app.get('/api/v1/users/getid', async function (req, res) {
        const packet = req.query;

        const username = packet.username;

        if (!username) {
            return utils.error(res, 400, "Missing username");
        }

        const id = await utils.UserManager.getIDByUsername(username);

        res.header('Content-type', "application/json");
        res.send({ success: true, id: id });
    });
}