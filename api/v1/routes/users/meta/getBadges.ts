import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/getBadges", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        if (!(await utils.UserManager.existsByUsername(username))) {
            res.status(404).json({ error: "NotFound" });
            return;
        }

        const badges = await utils.UserManager.getBadges(username);

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ badges: badges });
    });
}
