/**
 * @typedef {Object} Utils
 * @property {import("../../../../db/UserManager")} UserManager
 */

/**
 *
 * @param {any} app Express app
 * @param {Utils} utils Utils
 */
module.exports = (app, utils) => {
    app.post(
        "/api/v1/users/follow",
        utils.requireAuth(utils.UserManager),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const toggle = String(packet.toggle) === "true";

            const username = req.login.username;
            const userID = req.login.id;

            if (username === target) {
                utils.error(res, 400, "CannotFollowSelf");
                return;
            }

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                utils.error(res, 404, "TargetNotFound");
                return;
            }

            if (
                (await utils.UserManager.isFollowing(userID, targetID)) &&
                toggle
            ) {
                utils.error(res, 400, "AlreadyFollowing");
                return;
            } else if (
                !(await utils.UserManager.isFollowing(userID, targetID)) &&
                !toggle
            ) {
                utils.error(res, 400, "NotFollowing");
                return;
            }

            if (
                !(await utils.UserManager.hasFollowed(userID, targetID)) &&
                toggle
            ) {
                await utils.UserManager.sendMessage(
                    targetID,
                    { type: "followerAdded", user: userID },
                    false,
                    null,
                );
            }

            await utils.UserManager.followUser(userID, targetID, toggle);

            const followers = await utils.UserManager.getFollowerCount(target);

            if (
                followers >= utils.env.FollowAmount &&
                !(await utils.UserManager.hasBadge(target, "followers"))
            ) {
                await utils.UserManager.addBadge(target, "followers");
                await utils.UserManager.sendMessage(
                    targetID,
                    { type: "newBadge", badge: "followers" },
                    false,
                    null,
                );
            }

            res.status(200).json({ success: true });
        },
    );
};
