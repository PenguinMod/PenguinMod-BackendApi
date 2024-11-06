module.exports = (app, utils) => {
    app.get("/api/v1/users/isfollowing", async function (req, res) {
        const packet = req.query;

        const username = (String(packet.username)).toLowerCase();
        const target = (String(packet.target)).toLowerCase();

        if (!username || !target) {
            utils.error(res, 400, "Missing username or target");
            return;
        }

        if (!await utils.UserManager.existsByUsername(username)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 404, "NotFound");
            return;
        }

        const usernameID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);

        const isFollowing = await utils.UserManager.isFollowing(usernameID, targetID);

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ following: isFollowing });
    });
}