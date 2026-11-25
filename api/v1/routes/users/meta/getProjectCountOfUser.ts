import type { Application } from "express";
import type { Utils } from "../../../../../index";

export default function (app: Application, utils: Utils): void {
    app.post("/api/v1/users/getprojectcountofuser", async function (req, res) {
        const packet = req.body;

        const target = String(packet.target).toLowerCase();

        const userData = await utils.manager.users.getUserData(target);
        if (!userData || userData.permBanned) {
            res.status(404).json({ error: "TargetNotFound" });
            return;
        }

        const count = await utils.manager.projects.getProjectCountOfUser(
            userData.id,
        );

        res.status(200);
        res.header("Content-Type", "application/json");
        res.send({ count });
    });
}
