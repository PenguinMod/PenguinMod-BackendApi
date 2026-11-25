import type { Application } from "express";
import type { Utils } from "../../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/meta/getfollowercount", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        if (!username) {
            res.status(400).json({ error: "Missing username" });
            return;
        }

        const count = await utils.manager.users.getFollowerCount(username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ count: count });
    });
}
