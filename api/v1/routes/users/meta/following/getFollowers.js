module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/getfollowers", async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const page = packet.page || 0;

        if (!username) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const followers = await utils.UserManager.getFollowers(username, page, Number(utils.env.PageSize));

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send(followers);
    });
}