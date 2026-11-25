import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/getpfp", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const pfp = await utils.manager.users.getProfilePicture(username);

        if (!pfp.ok) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        res.status(200);
        res.header("Content-Type", "image/png");
        res.header("Cache-Control", "public, max-age=90");
        res.send(pfp.value);
    });
}
