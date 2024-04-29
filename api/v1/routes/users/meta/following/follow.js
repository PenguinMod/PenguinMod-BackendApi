module.exports = (app, utils) => {
    app.get("/api/v1/users/meta/follow", async function (req, res) {
        const packet = req.query;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;

        const toggle = packet.toggle;

        if (!username || !token || !target || typeof toggle !== "boolean") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(token, username)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const userID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);

        await utils.UserManager.followUser(userID, targetID, toggle);

        const followers = await utils.UserManager.getFollowerCount(targetID);

        if (followers >= utils.env.FollowAmount && !await utils.UserManager.hasBadge(target, "followers")) {
            await utils.UserManager.addBadge(target, "followers");
            await utils.UserManager.sendMessage(targetID, { type: "newBadge", badge: "followers" }, false, null);
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}