import type { Application } from "express";
import type { Utils } from "../../../../index";
import { makeUsername } from "../../db/new-types";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/getpfp", async function (req, res) {
        const packet = req.query;

        const username = makeUsername(String(packet.username));

        const userData = await utils.manager.users.getUserData(username);
        if (!userData) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        const pfp = await utils.manager.users.getProfilePicture(userData.id);
        if (!pfp) {
            throw new Error(
                `PFP Not Found for user ${username} (id: ${userData.id})`,
            );
        }

        res.status(200);
        res.header("Content-Type", "image/png");
        res.header("Cache-Control", "public, max-age=90");
        res.send(pfp);
    });
}
