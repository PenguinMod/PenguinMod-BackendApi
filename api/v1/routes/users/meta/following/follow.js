const UserManager = require("../../../../db/UserManager");

/**
 * @typedef {Object} Utils
 * @property {UserManager} UserManager
 */

/**
 * 
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post("/api/v1/users/follow", utils.cors(), async function (req, res) {
        const packet = req.body;

        const token = packet.token;

        const target = (String(packet.target)).toLowerCase();

        const toggle = packet.toggle;

        if (!token || !target || typeof toggle !== "boolean") {
            utils.error(res, 400, "Missing token, target, or toggle.");
            return;
        }

        const login = await utils.UserManager.loginWithToken(token);
        if (!login.success) {
            utils.error(res, 400, "Reauthenticate");
            return;
        }
        const username = login.username;
        const userID = login.id;

        if (!await utils.UserManager.existsByUsername(target)) {
            utils.error(res, 400, "Invalid target");
            return;
        }

        if (username === target) {
            utils.error(res, 400, "CannotFollowSelf");
            return;
        }

        const targetID = await utils.UserManager.getIDByUsername(target);

        if (await utils.UserManager.isFollowing(userID, targetID) && toggle) {
            utils.error(res, 400, "AlreadyFollowing");
            return;
        } else if (!await utils.UserManager.isFollowing(userID, targetID) && !toggle) {
            utils.error(res, 400, "NotFollowing");
            return;
        }

        if (!await utils.UserManager.hasFollowed(userID, targetID) && toggle) {
            await utils.UserManager.sendMessage(targetID, { type: "followerAdded", user: userID }, false, null);
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