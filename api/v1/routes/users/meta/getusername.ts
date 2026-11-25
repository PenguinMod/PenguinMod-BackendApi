import type { Application } from "express";
import type { Utils } from "../../../../../index";
import { userId } from "../../../db/new-types";

// TODO: kill this when possible. still used in frontend, by panel
// we should change users/profile to allow taking in an ID

export default function (app: Application, utils: Utils): void {
    app.get("/api/v1/users/getusername", async function (req, res) {
        const packet = req.query;

        const userData = await utils.manager.users.getUserDataByID(
            userId(String(packet.ID)),
        );
        if (!userData || userData.permBanned) {
            return res.status(404).json({ error: "UserNotFound" });
        }

        res.status(200);
        res.header("Content-type", "text/plain");
        res.send({ username: userData.username });
    });
}
