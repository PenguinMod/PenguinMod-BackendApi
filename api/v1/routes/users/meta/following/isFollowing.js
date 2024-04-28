module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const target = packet.target;

        if (!username || !target) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const isFollowing = await utils.UserManager.isFollowing(username, target);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ following: isFollowing });
    });
}