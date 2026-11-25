import type { Application } from "express";
import type { Utils } from "../../../../../index";

// TODO: this endpoint can probably be killed

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/getusername", async function (req, res) {
        const packet = req.query;

        const username = await utils.UserManager.getUsernameByID(
            String(packet.ID),
            false,
        );
        if (!username) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        res.status(200);
        res.header("Content-type", "text/plain");
        res.send({ username: username });
    });
}
