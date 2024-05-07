module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/getfollowercount", async function (req, res) {
        const packet = req.query;

        const username = packet.username;

        if (!username) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const count = await utils.UserManager.getFollowerCount(username);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ count: count });
    });
}