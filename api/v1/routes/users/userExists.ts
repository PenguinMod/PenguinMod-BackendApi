import type { Application } from "express";
import type { Utils } from "../../../../index";

// TODO: kill. this is used to frontend unfortunately. but its STUPID and BAD

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/userexists", async function (req, res) {
        const packet = req.query;

        const username = String(packet.username).toLowerCase();

        const exists = await utils.manager.users.existsByUsername(username);

        res.status(200);
        res.header("Content-type", "application/json");
        res.send({ exists });
    });
}
