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

            const targetData = await utils.manager.users.getUserData(target);
            if (!targetData || targetData.permBanned) {
                res.status(404).json({ error: "TargetNotFound" });
                return;
            }

            if (
                (await utils.manager.users.isFollowing(
                    userID,
                    targetData.id,
                )) &&
                toggle
            ) {
                res.status(400).json({ error: "AlreadyFollowing" });
                return;
            } else if (
                !(await utils.manager.users.isFollowing(
                    userID,
                    targetData.id,
                )) &&
                !toggle
            ) {
                res.status(400).json({ error: "NotFollowing" });
                return;
            }

            if (
                !(await utils.manager.users.hasFollowed(
                    userID,
                    targetData.id,
                )) &&
                toggle
            ) {
                await utils.manager.messages.sendMessage(
                    targetData.id,
                    { type: "followerAdded", user: userID },
                    false,
                    undefined,
                );
            }

            await utils.manager.users.followUser(userID, targetData.id, toggle);

            const followers = targetData.followers;

            if (
                followers >= Number(process.env.FollowAmount) &&
                !targetData.badges.includes("followers")
            ) {
                await utils.manager.users.addBadge(target, "followers");
                await utils.manager.messages.sendMessage(
                    targetData.id,
                    { type: "newBadge", badge: "followers" },
                    false,
                    undefined,
                );
            }

            res.status(200).json({ success: true });
        },
    );
}
