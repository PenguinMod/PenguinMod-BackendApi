module.exports = (app, utils) => {
    app.get('/api/v1/users/getusername', async function (req, res) {
        const packet = req.query;

        const ID = packet.ID;

        if (!ID) {
            return utils.error(res, 400, "Missing ID");
        }

        const username = await utils.UserManager.getUsernameByID(ID);

        res.header('Content-type', "application/json");
        res.send({ success: true, username: username });
    });
}