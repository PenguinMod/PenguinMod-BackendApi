module.exports = (app, utils) => {
    app.post("/api/v1/users/follow", async function (req, res) {
        const packet = req.body;

        const username = packet.username;
        const token = packet.token;

        const target = packet.target;

        const toggle = packet.toggle;

        if (!username || !token || !target || typeof toggle !== "boolean") {
            utils.error(res, 400, "InvalidData");
            return;
        }

        if (!await utils.UserManager.loginWithToken(username, token)) {
            utils.error(res, 401, "InvalidToken");
            return;
        }

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 400, "InvalidData");
            return;
        }

        const userID = await utils.UserManager.getIDByUsername(username);
        const targetID = await utils.UserManager.getIDByUsername(target);

        if (await utils.UserManager.isFollowing(userID, targetID) && toggle) {
            utils.error(res, 400, "AlreadyFollowing");
            return;
        } else if (!await utils.UserManager.isFollowing(userID, targetID) && !toggle) {
            utils.error(res, 400, "NotFollowing");
            return;
        }



        await utils.UserManager.followUser(userID, targetID, toggle);

        const followers = await utils.UserManager.getFollowerCount(target);

        if (followers >= utils.env.FollowAmount && !await utils.UserManager.hasBadge(target, "followers")) {
            await utils.UserManager.addBadge(target, "followers");
            await utils.UserManager.sendMessage(targetID, { type: "newBadge", badge: "followers" }, false, null);
        }

        res.status(200);
        res.header("Content-Type", 'application/json');
        res.send({ success: true });
    });
}