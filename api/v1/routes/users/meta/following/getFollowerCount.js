module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/getfollowercount", async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const page = packet.page || 0;

        if (!username) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const count = await utils.UserManager.getFollowerCount(username, page, utils.env.PageSize);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ "count": count });
    });
}