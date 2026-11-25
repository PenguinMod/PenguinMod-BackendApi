import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/privateProfile",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const username = res.locals.login.username;

            const privateProfile = String(packet.privateProfile) === "true";
            const privateToFollowing =
                String(packet.privateToFollowing) === "true";

            if (
                typeof privateProfile !== "boolean" ||
                typeof privateToFollowing !== "boolean"
            ) {
                res.status(400).json({ error: "InvalidBody" });
                return;
            }

            await utils.manager.users.setPrivateProfile(
                username,
                privateProfile,
            );
            await utils.manager.users.setFollowingSeeProfile(
                username,
                privateToFollowing,
            );

            res.status(200).json({ success: true });
        },
    );
}
