import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { requireAuth } from "../../../../../utils/auth";

export default function (app: Application, utils: Utils): void {
    app.post(
        "/api/v1/users/privateProfile",
        ...requireAuth(utils.manager.auth),
        async function (req, res) {
            const packet = req.body;

            const id = res.locals.login.id;

            const privateProfile = String(packet.privateProfile) === "true";
            const privateToFollowing =
                String(packet.privateToFollowing) === "true";

            await utils.manager.users.setPrivateProfile(
                id,
                privateProfile,
                !privateToFollowing,
            );

            res.status(200).json({ success: true });
        },
    );
}
