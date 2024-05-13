module.exports = (app, utils) => {
    app.get('/api/v1/projects/searchusers', async (req, res) => {
        const packet = req.query;

        const query = packet.query || "";
        const page = Number(packet.page) || 0;

        const users = await utils.UserManager.searchUsers(query, page, Number(utils.env.PageSize));

        console.log(users);

        res.status(200);
        res.header({"Content-Type": "application/json"})
        return res.send(users);
    });
}