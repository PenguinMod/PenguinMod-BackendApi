import type { Application } from "express";
import type { Utils } from "../../../../index";

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/userexists", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const exists = await utils.UserManager.existsByUsername(username);

        res.status(200);
        res.header("Content-type", "application/json");
        res.send({ exists });
    });
}
