import type { Application } from "express";
import type { Utils } from "../../../../../../index";
import { requireAuth } from "../../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/follow",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const target = String(packet.target).toLowerCase();
            const toggle = String(packet.toggle) === "true";

            const username = res.locals.login.username;
            const userID = res.locals.login.id;

            if (username === target) {
                res.status(400).json({ error: "CannotFollowSelf" });
                return;
            }

            const targetID = await utils.UserManager.getIDByUsername(
                target,
                false,
            );
            if (!targetID) {
                res.status(404).json({ error: "TargetNotFound" });
                return;
            }

            if (
                (await utils.UserManager.isFollowing(userID, targetID)) &&
                toggle
            ) {
                res.status(400).json({ error: "AlreadyFollowing" });
                return;
            } else if (
                !(await utils.UserManager.isFollowing(userID, targetID)) &&
                !toggle
            ) {
                res.status(400).json({ error: "NotFollowing" });
                return;
            }

            if (
                !(await utils.UserManager.hasFollowed(userID, targetID)) &&
                toggle
            ) {
                await utils.manager.messages.sendMessage(
                    targetID,
                    { type: "followerAdded", user: userID },
                    false,
                    null,
                );
            }

            await utils.UserManager.followUser(userID, targetID, toggle);

            const followers = await utils.UserManager.getFollowerCount(target);

            if (
                followers >= process.env.FollowAmount &&
                !(await utils.UserManager.hasBadge(target, "followers"))
            ) {
                await utils.manager.users.addBadge(target, "followers");
                await utils.manager.messages.sendMessage(
                    targetID,
                    { type: "newBadge", badge: "followers" },
                    false,
                    null,
                );
            }

            res.status(200).json({ success: true });
        },
    );
}
